use crate::generators;
use crate::TestApp;
use serde_json::Value;

/// Percent-encode a value for use as a single URL path segment.
fn encode(s: &str) -> String {
    url::form_urlencoded::byte_serialize(s.as_bytes()).collect()
}

// ---------------------------------------------------------------------------
// Helper: create a namespace via the API
// ---------------------------------------------------------------------------
async fn create_namespace(app: &TestApp, name: &str, owner: &str) {
    let url = format!("{}/api/v1/namespaces/{}", app.base_url, encode(name));
    let resp = app
        .client
        .put(&url)
        .json(&serde_json::json!({
            "ownerName": owner,
            "description": "test namespace"
        }))
        .send()
        .await
        .expect("create namespace request");
    assert!(
        resp.status().is_success(),
        "create namespace failed: {}",
        resp.status()
    );
}

// ---------------------------------------------------------------------------
// Helper: create a job via the API
// ---------------------------------------------------------------------------
async fn create_job(app: &TestApp, namespace: &str, name: &str) {
    let url = format!(
        "{}/api/v1/namespaces/{}/jobs/{}",
        app.base_url,
        encode(namespace),
        name
    );
    let resp = app
        .client
        .put(&url)
        .json(&serde_json::json!({
            "type": "BATCH",
            "inputs": [],
            "outputs": [],
            "description": "test job"
        }))
        .send()
        .await
        .expect("create job request");
    assert!(
        resp.status().is_success(),
        "create job failed: {}",
        resp.status()
    );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[tokio::test]
async fn get_lineage_for_job() {
    let app = TestApp::new().await;

    // Use a simple namespace name without colons for nodeId compatibility
    let ns = format!("lineage_ns_{}", rand::random_range(0..u32::MAX));
    let owner = generators::new_owner_name();
    let job = generators::new_job_name();

    create_namespace(&app, &ns, &owner).await;
    create_job(&app, &ns, &job).await;

    let node_id = format!("job:{}:{}", ns, job);
    let url = format!(
        "{}/api/v1/lineage?nodeId={}&depth=10",
        app.base_url, node_id
    );
    let resp = app
        .client
        .get(&url)
        .send()
        .await
        .expect("get lineage request");

    assert_eq!(resp.status(), 200);

    let body: Value = resp.json().await.expect("parse json");
    // Lineage response has a "graph" array
    assert!(
        body.get("graph").is_some(),
        "response missing 'graph' field"
    );
}

#[tokio::test]
async fn post_lineage_event() {
    let app = TestApp::new().await;

    let ns = generators::new_namespace_name();
    let job = generators::new_job_name();
    let run_id = generators::new_run_id();

    let event = serde_json::json!({
        "eventType": "START",
        "eventTime": "2024-01-01T00:00:00Z",
        "run": {
            "runId": run_id.to_string()
        },
        "job": {
            "namespace": ns,
            "name": job
        },
        "inputs": [],
        "outputs": [],
        "producer": "test"
    });

    let url = format!("{}/api/v1/lineage", app.base_url);
    let resp = app
        .client
        .post(&url)
        .json(&event)
        .send()
        .await
        .expect("post lineage event request");

    assert_eq!(
        resp.status(),
        201,
        "expected 201 Created, got {}",
        resp.status()
    );
}

#[tokio::test]
async fn list_lineage_events() {
    let app = TestApp::new().await;

    // First, post a lineage event so there is at least one to list
    let ns = generators::new_namespace_name();
    let job = generators::new_job_name();
    let run_id = generators::new_run_id();

    let event_time = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    let event = serde_json::json!({
        "eventType": "COMPLETE",
        "eventTime": event_time,
        "run": {
            "runId": run_id.to_string()
        },
        "job": {
            "namespace": ns,
            "name": job
        },
        "inputs": [],
        "outputs": [],
        "producer": "test"
    });

    let post_url = format!("{}/api/v1/lineage", app.base_url);
    let post_resp = app
        .client
        .post(&post_url)
        .json(&event)
        .send()
        .await
        .expect("post lineage event");
    assert_eq!(post_resp.status(), 201);

    // Now list events
    let list_url = format!("{}/api/v1/events/lineage", app.base_url);
    let resp = app
        .client
        .get(&list_url)
        .send()
        .await
        .expect("list lineage events request");

    assert_eq!(resp.status(), 200);

    let body: Value = resp.json().await.expect("parse json");
    assert!(
        body.get("totalCount").is_some(),
        "response missing totalCount"
    );
    assert!(body.get("events").is_some(), "response missing events");

    let total_count = body["totalCount"].as_i64().unwrap();
    assert!(
        total_count >= 1,
        "expected at least 1 event, got {}",
        total_count
    );
}

#[tokio::test]
async fn get_lineage_bad_node_id() {
    let app = TestApp::new().await;

    // "invalid" does not follow the "type:namespace:name" format
    let url = format!("{}/api/v1/lineage?nodeId=invalid", app.base_url);
    let resp = app
        .client
        .get(&url)
        .send()
        .await
        .expect("get lineage bad node id request");

    assert_eq!(
        resp.status(),
        400,
        "expected 400 for invalid nodeId, got {}",
        resp.status()
    );
}

/// After posting a single COMPLETE event with input + output datasets,
/// the lineage graph should have 3 nodes (1 job + 2 datasets) with
/// non-empty inEdges / outEdges connecting them.
#[tokio::test]
async fn lineage_graph_has_edges_after_single_event() {
    let app = TestApp::new().await;

    let ns = format!("lineage_edge_ns_{}", rand::random_range(0..u32::MAX));
    let job = generators::new_job_name();
    let run_id = generators::new_run_id();
    let input_ds = format!("input_{}", rand::random_range(0..u32::MAX));
    let output_ds = format!("output_{}", rand::random_range(0..u32::MAX));

    // Post a COMPLETE event with input + output datasets
    let event = serde_json::json!({
        "eventType": "COMPLETE",
        "eventTime": chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
        "run": { "runId": run_id.to_string() },
        "job": { "namespace": ns, "name": job },
        "inputs": [{ "namespace": ns, "name": input_ds }],
        "outputs": [{ "namespace": ns, "name": output_ds }],
        "producer": "test"
    });

    let post_url = format!("{}/api/v1/lineage", app.base_url);
    let post_resp = app
        .client
        .post(&post_url)
        .json(&event)
        .send()
        .await
        .expect("post lineage event");
    assert_eq!(post_resp.status(), 201, "POST event should succeed");

    // Query lineage from the job node
    let job_node_id = format!("job:{}:{}", ns, job);
    let url = format!(
        "{}/api/v1/lineage?nodeId={}&depth=10",
        app.base_url, job_node_id
    );
    let resp = app
        .client
        .get(&url)
        .send()
        .await
        .expect("get lineage from job");
    assert_eq!(resp.status(), 200);

    let body: Value = resp.json().await.expect("parse json");
    let graph = body["graph"].as_array().expect("graph should be an array");

    // Should have 3 nodes: 1 job + 2 datasets
    assert_eq!(
        graph.len(),
        3,
        "Expected 3 nodes (1 job + 2 datasets), got {}. Graph: {:?}",
        graph.len(),
        graph
    );

    // Find the job node and verify it has edges
    let job_node = graph
        .iter()
        .find(|n| n["type"] == "JOB")
        .expect("Should have a JOB node");
    let job_in_edges = job_node["inEdges"].as_array().expect("inEdges array");
    let job_out_edges = job_node["outEdges"].as_array().expect("outEdges array");
    assert!(
        !job_in_edges.is_empty(),
        "Job node should have inEdges (from input dataset)"
    );
    assert!(
        !job_out_edges.is_empty(),
        "Job node should have outEdges (to output dataset)"
    );

    // Query lineage from a dataset node
    let ds_node_id = format!("dataset:{}:{}", ns, output_ds);
    let ds_url = format!(
        "{}/api/v1/lineage?nodeId={}&depth=10",
        app.base_url, ds_node_id
    );
    let ds_resp = app
        .client
        .get(&ds_url)
        .send()
        .await
        .expect("get lineage from dataset");
    assert_eq!(ds_resp.status(), 200);

    let ds_body: Value = ds_resp.json().await.expect("parse dataset lineage json");
    let ds_graph = ds_body["graph"]
        .as_array()
        .expect("graph should be an array");

    // Dataset-start lineage should also return a non-trivial graph
    assert!(
        ds_graph.len() > 1,
        "Dataset-start lineage should have more than 1 node, got {}",
        ds_graph.len()
    );

    // The output dataset node should have inEdges (from the producing job)
    let output_node = ds_graph
        .iter()
        .find(|n| {
            let id_str = n["id"].as_str().unwrap_or("");
            id_str.contains(&output_ds) && n["type"] == "DATASET"
        })
        .expect("Should find the output dataset node");
    let ds_in_edges = output_node["inEdges"]
        .as_array()
        .expect("dataset inEdges array");
    assert!(
        !ds_in_edges.is_empty(),
        "Output dataset node should have inEdges from the producing job"
    );
}

/// Bug 1 regression: depth parameter must limit lineage traversal.
/// A 3-job chain queried with depth=1 should NOT include the third job.
#[tokio::test]
async fn lineage_depth_parameter_limits_traversal() {
    let app = TestApp::new().await;

    let ns = format!("depth_ns_{}", rand::random_range(0..u32::MAX));
    let job_a = format!("job_a_{}", rand::random_range(0..u32::MAX));
    let job_b = format!("job_b_{}", rand::random_range(0..u32::MAX));
    let job_c = format!("job_c_{}", rand::random_range(0..u32::MAX));
    let ds_ab = format!("ds_ab_{}", rand::random_range(0..u32::MAX));
    let ds_bc = format!("ds_bc_{}", rand::random_range(0..u32::MAX));
    let run_a = generators::new_run_id();
    let run_b = generators::new_run_id();
    let run_c = generators::new_run_id();

    let post_url = format!("{}/api/v1/lineage", app.base_url);
    let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);

    // job_a COMPLETE → outputs ds_ab
    let resp = app
        .client
        .post(&post_url)
        .json(&serde_json::json!({
            "eventType": "COMPLETE",
            "eventTime": now,
            "run": { "runId": run_a.to_string() },
            "job": { "namespace": ns, "name": job_a },
            "inputs": [],
            "outputs": [{ "namespace": ns, "name": ds_ab }],
            "producer": "test"
        }))
        .send()
        .await
        .unwrap();
    assert_eq!(resp.status(), 201);

    // job_b COMPLETE → inputs ds_ab, outputs ds_bc
    let resp = app
        .client
        .post(&post_url)
        .json(&serde_json::json!({
            "eventType": "COMPLETE",
            "eventTime": now,
            "run": { "runId": run_b.to_string() },
            "job": { "namespace": ns, "name": job_b },
            "inputs": [{ "namespace": ns, "name": ds_ab }],
            "outputs": [{ "namespace": ns, "name": ds_bc }],
            "producer": "test"
        }))
        .send()
        .await
        .unwrap();
    assert_eq!(resp.status(), 201);

    // job_c COMPLETE → inputs ds_bc
    let resp = app
        .client
        .post(&post_url)
        .json(&serde_json::json!({
            "eventType": "COMPLETE",
            "eventTime": now,
            "run": { "runId": run_c.to_string() },
            "job": { "namespace": ns, "name": job_c },
            "inputs": [{ "namespace": ns, "name": ds_bc }],
            "outputs": [],
            "producer": "test"
        }))
        .send()
        .await
        .unwrap();
    assert_eq!(resp.status(), 201);

    // depth=1 from job_a: should see job_a + ds_ab + job_b but NOT ds_bc or job_c
    let node_id = format!("job:{}:{}", ns, job_a);
    let url = format!("{}/api/v1/lineage?nodeId={}&depth=1", app.base_url, node_id);
    let resp = app.client.get(&url).send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.unwrap();
    let graph = body["graph"].as_array().expect("graph array");
    let node_ids: Vec<&str> = graph.iter().filter_map(|n| n["id"].as_str()).collect();
    assert!(
        node_ids.iter().any(|id| id.contains(&job_a)),
        "depth=1 should include job_a"
    );
    assert!(
        node_ids.iter().any(|id| id.contains(&job_b)),
        "depth=1 should include job_b (1 hop)"
    );
    assert!(
        !node_ids.iter().any(|id| id.contains(&job_c)),
        "depth=1 should NOT include job_c (2 hops). Nodes: {:?}",
        node_ids
    );

    // depth=10: should include all jobs
    let deep_url = format!(
        "{}/api/v1/lineage?nodeId={}&depth=10",
        app.base_url, node_id
    );
    let resp = app.client.get(&deep_url).send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.unwrap();
    let graph = body["graph"].as_array().expect("graph array");
    let node_ids: Vec<&str> = graph.iter().filter_map(|n| n["id"].as_str()).collect();
    assert!(
        node_ids.iter().any(|id| id.contains(&job_c)),
        "depth=10 should include job_c. Nodes: {:?}",
        node_ids
    );
}

/// Bug 2 regression: facets in lineage response must be flat, not double-wrapped.
#[tokio::test]
async fn lineage_run_facets_are_flat() {
    let app = TestApp::new().await;

    let ns = format!("facet_ns_{}", rand::random_range(0..u32::MAX));
    let job = generators::new_job_name();
    let run_id = generators::new_run_id();
    let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);

    // Post COMPLETE event with a run facet (sql)
    let post_url = format!("{}/api/v1/lineage", app.base_url);
    let resp = app
        .client
        .post(&post_url)
        .json(&serde_json::json!({
            "eventType": "COMPLETE",
            "eventTime": now,
            "run": {
                "runId": run_id.to_string(),
                "facets": {
                    "sql": {
                        "query": "CREATE TABLE t AS SELECT 1",
                        "_producer": "test",
                        "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/SqlJobFacet.json"
                    }
                }
            },
            "job": { "namespace": ns, "name": job },
            "inputs": [],
            "outputs": [],
            "producer": "test"
        }))
        .send()
        .await
        .unwrap();
    assert_eq!(resp.status(), 201);

    // GET lineage and check the job node's latestRun facets
    let node_id = format!("job:{}:{}", ns, job);
    let url = format!(
        "{}/api/v1/lineage?nodeId={}&depth=10",
        app.base_url, node_id
    );
    let resp = app.client.get(&url).send().await.unwrap();
    assert_eq!(resp.status(), 200);

    let body: Value = resp.json().await.unwrap();
    let graph = body["graph"].as_array().expect("graph array");
    let job_node = graph
        .iter()
        .find(|n| n["type"] == "JOB")
        .expect("should have JOB node");

    let latest_run = &job_node["data"]["latestRun"];
    if !latest_run.is_null() {
        let facets = &latest_run["facets"];
        if !facets.is_null() && facets.get("sql").is_some() {
            let sql_facet = &facets["sql"];
            // Should be {"query": "...", ...}, NOT {"sql": {"query": "..."}}
            assert!(
                sql_facet.get("query").is_some(),
                "sql facet should directly contain 'query', got: {}",
                sql_facet
            );
            assert!(
                sql_facet.get("sql").is_none(),
                "sql facet should NOT be double-wrapped, got: {}",
                facets
            );
        }
    }
}

// ---------------------------------------------------------------------------
// Job facets on job nodes
// ---------------------------------------------------------------------------

/// POST a COMPLETE event for `job` reading `input` and writing `output`.
async fn post_complete_event(
    app: &TestApp,
    ns: &str,
    job: &str,
    event_time: &str,
    job_facets: Option<Value>,
    input: &str,
    output: &str,
) {
    let mut job_obj = serde_json::json!({ "namespace": ns, "name": job });
    if let Some(facets) = job_facets {
        job_obj["facets"] = facets;
    }
    let event = serde_json::json!({
        "eventType": "COMPLETE",
        "eventTime": event_time,
        "run": { "runId": generators::new_run_id().to_string() },
        "job": job_obj,
        "inputs": [{ "namespace": ns, "name": input }],
        "outputs": [{ "namespace": ns, "name": output }],
        "producer": "test"
    });
    let resp = app
        .client
        .post(format!("{}/api/v1/lineage", app.base_url))
        .json(&event)
        .send()
        .await
        .expect("post lineage event");
    assert_eq!(resp.status(), 201, "POST event should succeed");
}

/// GET the lineage graph around `node_id`.
async fn get_graph(app: &TestApp, node_id: &str) -> Vec<Value> {
    let url = format!(
        "{}/api/v1/lineage?nodeId={}&depth=10",
        app.base_url, node_id
    );
    let resp = app.client.get(&url).send().await.expect("get lineage");
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.expect("parse json");
    body["graph"].as_array().expect("graph array").clone()
}

fn job_type_facet(job_type: &str) -> Value {
    serde_json::json!({
        "_producer": "test",
        "_schemaURL": "https://openlineage.io/spec/facets/2-0-3/JobTypeJobFacet.json",
        "processingType": "BATCH",
        "integration": "ORACLE",
        "jobType": job_type
    })
}

fn axis_layers_facet(wave: i64) -> Value {
    serde_json::json!({
        "_producer": "https://github.com/getindata/axis",
        "_schemaURL": "https://raw.githubusercontent.com/getindata/axis/main/spec/facets/AxisLayersFacet.json",
        "values": {
            "wave": { "value": wave, "asOf": "2026-10-30" },
            "complexity": { "value": 0.64 }
        }
    })
}

/// A job node's data carries the job's facets: the standard `jobType`
/// facet and a custom one come back flat under `data.facets`.
#[tokio::test]
async fn lineage_job_node_carries_job_facets() {
    let app = TestApp::new().await;

    let ns = format!("job_facets_ns_{}", rand::random_range(0..u32::MAX));
    let job = generators::new_job_name();
    let input = format!("input_{}", rand::random_range(0..u32::MAX));
    let output = format!("output_{}", rand::random_range(0..u32::MAX));

    post_complete_event(
        &app,
        &ns,
        &job,
        "2026-10-30T10:00:00.000Z",
        Some(serde_json::json!({
            "jobType": job_type_facet("procedure"),
            "axisLayers": axis_layers_facet(1)
        })),
        &input,
        &output,
    )
    .await;

    let graph = get_graph(&app, &format!("job:{}:{}", ns, job)).await;
    let job_node = graph
        .iter()
        .find(|n| n["type"] == "JOB")
        .expect("should have a JOB node");
    let facets = &job_node["data"]["facets"];

    assert_eq!(
        facets["jobType"]["jobType"], "procedure",
        "facets: {facets}"
    );
    assert_eq!(
        facets["jobType"]["integration"], "ORACLE",
        "facets: {facets}"
    );
    assert_eq!(
        facets["axisLayers"]["values"]["wave"]["value"], 1,
        "facets: {facets}"
    );
    assert_eq!(
        facets["axisLayers"]["values"]["complexity"]["value"], 0.64,
        "facets: {facets}"
    );
}

/// Facets merge by name across the current job version's events, the
/// newest event winning; a job without facets gets `{}`.
#[tokio::test]
async fn lineage_job_node_facets_merge_newest_wins() {
    let app = TestApp::new().await;

    let ns = format!("job_facets_merge_ns_{}", rand::random_range(0..u32::MAX));
    let job = generators::new_job_name();
    let plain_job = generators::new_job_name();
    let input = format!("input_{}", rand::random_range(0..u32::MAX));
    let middle = format!("middle_{}", rand::random_range(0..u32::MAX));
    let output = format!("output_{}", rand::random_range(0..u32::MAX));

    // Two runs of the same job with the same IO (one job version). The
    // newer event changes axisLayers and omits jobType.
    post_complete_event(
        &app,
        &ns,
        &job,
        "2026-10-30T10:00:00.000Z",
        Some(serde_json::json!({
            "jobType": job_type_facet("procedure"),
            "axisLayers": axis_layers_facet(1)
        })),
        &input,
        &middle,
    )
    .await;
    post_complete_event(
        &app,
        &ns,
        &job,
        "2026-10-30T11:00:00.000Z",
        Some(serde_json::json!({ "axisLayers": axis_layers_facet(2) })),
        &input,
        &middle,
    )
    .await;
    // A downstream job with no job facets at all.
    post_complete_event(
        &app,
        &ns,
        &plain_job,
        "2026-10-30T12:00:00.000Z",
        None,
        &middle,
        &output,
    )
    .await;

    let graph = get_graph(&app, &format!("job:{}:{}", ns, job)).await;
    let node = |name: &str| {
        graph
            .iter()
            .find(|n| n["id"] == format!("job:{}:{}", ns, name))
            .unwrap_or_else(|| panic!("job node {name} missing: {graph:?}"))
            .clone()
    };

    let facets = node(&job)["data"]["facets"].clone();
    assert_eq!(
        facets["axisLayers"]["values"]["wave"]["value"], 2,
        "newest event's axisLayers should win: {facets}"
    );
    assert_eq!(
        facets["jobType"]["jobType"], "procedure",
        "older facet names stay when the newer event omits them: {facets}"
    );

    assert_eq!(
        node(&plain_job)["data"]["facets"],
        serde_json::json!({}),
        "a job without facets gets {{}}"
    );
}

// ---------------------------------------------------------------------------
// Dataset facets on dataset nodes
// ---------------------------------------------------------------------------

/// POST a raw OpenLineage event.
async fn post_event(app: &TestApp, event: Value) {
    let resp = app
        .client
        .post(format!("{}/api/v1/lineage", app.base_url))
        .json(&event)
        .send()
        .await
        .expect("post lineage event");
    assert_eq!(resp.status(), 201, "POST event should succeed");
}

fn schema_facet() -> Value {
    serde_json::json!({
        "_producer": "test",
        "_schemaURL": "https://openlineage.io/spec/facets/1-1-1/SchemaDatasetFacet.json",
        "fields": [
            { "name": "order_id", "type": "NUMBER" },
            { "name": "amount", "type": "NUMBER" }
        ]
    })
}

fn find_node<'a>(graph: &'a [Value], id: &str) -> &'a Value {
    graph
        .iter()
        .find(|n| n["id"] == id)
        .unwrap_or_else(|| panic!("node {id} missing: {graph:?}"))
}

/// A dataset node's data carries the facets of the dataset's current
/// version: `schema` and a custom facet come back flat under `data.facets`.
#[tokio::test]
async fn lineage_dataset_node_carries_dataset_facets() {
    let app = TestApp::new().await;

    let ns = format!("ds_facets_ns_{}", rand::random_range(0..u32::MAX));
    let job = generators::new_job_name();
    let input = format!("input_{}", rand::random_range(0..u32::MAX));
    let output = format!("output_{}", rand::random_range(0..u32::MAX));

    post_event(
        &app,
        serde_json::json!({
            "eventType": "COMPLETE",
            "eventTime": "2026-10-30T10:00:00.000Z",
            "run": { "runId": generators::new_run_id().to_string() },
            "job": { "namespace": ns, "name": job },
            "inputs": [{ "namespace": ns, "name": input }],
            "outputs": [{
                "namespace": ns,
                "name": output,
                "facets": {
                    "schema": schema_facet(),
                    "axisLayers": axis_layers_facet(1)
                }
            }],
            "producer": "test"
        }),
    )
    .await;

    let graph = get_graph(&app, &format!("job:{}:{}", ns, job)).await;
    let facets = &find_node(&graph, &format!("dataset:{}:{}", ns, output))["data"]["facets"];

    assert_eq!(
        facets["schema"]["fields"][0]["name"], "order_id",
        "facets: {facets}"
    );
    assert_eq!(
        facets["axisLayers"]["values"]["wave"]["value"], 1,
        "facets: {facets}"
    );
    // The input carries no event facets. The server still writes its own
    // `lineageStatistics` facet for every dataset in the lineage.
    let input_facets = find_node(&graph, &format!("dataset:{}:{}", ns, input))["data"]["facets"]
        .as_object()
        .expect("input dataset facets should be an object")
        .clone();
    assert!(
        input_facets.keys().all(|k| k == "lineageStatistics"),
        "input dataset should carry no event facets: {input_facets:?}"
    );
}

/// Facets merge by name across the events that touch the dataset's
/// current version, the newest event winning: a later job reading the
/// dataset updates `axisLayers` and `schema` stays.
#[tokio::test]
async fn lineage_dataset_node_facets_merge_newest_wins() {
    let app = TestApp::new().await;

    let ns = format!("ds_facets_merge_ns_{}", rand::random_range(0..u32::MAX));
    let producer = generators::new_job_name();
    let consumer = generators::new_job_name();
    let source = format!("source_{}", rand::random_range(0..u32::MAX));
    let middle = format!("middle_{}", rand::random_range(0..u32::MAX));
    let sink = format!("sink_{}", rand::random_range(0..u32::MAX));

    // The producer writes `middle` with schema and wave 1.
    post_event(
        &app,
        serde_json::json!({
            "eventType": "COMPLETE",
            "eventTime": "2026-10-30T10:00:00.000Z",
            "run": { "runId": generators::new_run_id().to_string() },
            "job": { "namespace": ns, "name": producer },
            "inputs": [{ "namespace": ns, "name": source }],
            "outputs": [{
                "namespace": ns,
                "name": middle,
                "facets": {
                    "schema": schema_facet(),
                    "axisLayers": axis_layers_facet(1)
                }
            }],
            "producer": "test"
        }),
    )
    .await;
    // Later, the consumer reads `middle` (same version) with wave 2 only.
    post_event(
        &app,
        serde_json::json!({
            "eventType": "COMPLETE",
            "eventTime": "2026-10-30T11:00:00.000Z",
            "run": { "runId": generators::new_run_id().to_string() },
            "job": { "namespace": ns, "name": consumer },
            "inputs": [{
                "namespace": ns,
                "name": middle,
                "facets": { "axisLayers": axis_layers_facet(2) }
            }],
            "outputs": [{ "namespace": ns, "name": sink }],
            "producer": "test"
        }),
    )
    .await;

    let graph = get_graph(&app, &format!("job:{}:{}", ns, producer)).await;
    let facets = &find_node(&graph, &format!("dataset:{}:{}", ns, middle))["data"]["facets"];

    assert_eq!(
        facets["axisLayers"]["values"]["wave"]["value"], 2,
        "newest event's axisLayers should win: {facets}"
    );
    assert_eq!(
        facets["schema"]["fields"][1]["name"], "amount",
        "older facet names stay when the newer event omits them: {facets}"
    );
}

/// A dataset-only lineage node (no job reads or writes it) whose current
/// version has no qualifying facet rows gets `facets: {}`.
#[tokio::test]
async fn lineage_dataset_only_node_without_facets_gets_empty_object() {
    let app = TestApp::new().await;

    let ns = format!("ds_only_ns_{}", rand::random_range(0..u32::MAX));
    let src = format!("ds_only_src_{}", rand::random_range(0..u32::MAX));
    let ds = format!("orphan_{}", rand::random_range(0..u32::MAX));

    create_namespace(&app, &ns, "test_owner").await;
    let resp = app
        .client
        .put(format!("{}/api/v1/sources/{}", app.base_url, src))
        .json(&serde_json::json!({
            "type": "POSTGRESQL",
            "connectionUrl": "postgresql://localhost:5432/test"
        }))
        .send()
        .await
        .expect("create source");
    assert!(
        resp.status().is_success(),
        "create source: {}",
        resp.status()
    );
    let resp = app
        .client
        .put(format!(
            "{}/api/v1/namespaces/{}/datasets/{}",
            app.base_url,
            encode(&ns),
            ds
        ))
        .json(&serde_json::json!({
            "type": "DB_TABLE",
            "physicalName": ds,
            "sourceName": src
        }))
        .send()
        .await
        .expect("create dataset");
    assert!(
        resp.status().is_success(),
        "create dataset: {}",
        resp.status()
    );

    let node_id = format!("dataset:{}:{}", ns, ds);
    let graph = get_graph(&app, &node_id).await;
    assert_eq!(graph.len(), 1, "dataset-only graph: {graph:?}");
    let node = find_node(&graph, &node_id);
    assert_eq!(node["type"], "DATASET");
    assert_eq!(
        node["data"]["facets"],
        serde_json::json!({}),
        "a dataset without facet rows gets {{}}: {node}"
    );
}
