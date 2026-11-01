/* SPDX-License-Identifier: Apache-2.0 */

/* Backfill runs.transitioned_at for runs that have a state but no transition
   time. The Rust API's run INSERT used to leave the column NULL: only its
   ON CONFLICT branch set it, so a run created by a single event kept NULL.
   The job detail and job list pick a job's latest run by
   transitioned_at DESC NULLS LAST, so such a run ranked below every older run
   that had received a second event, and the job showed that older run's facets.
   A NULL row was inserted once and never updated (the ON CONFLICT branch and
   run state transitions both set the column), so created_at is the time the
   fixed INSERT writes: ingestion time, the clock the other rows use.
   run_states.transitioned_at and updated_at hold the event time instead, which
   would rank a back-dated or replayed run below older runs ingested before it.
   The column is TIMESTAMP (V30), stored in UTC. */
UPDATE runs
SET transitioned_at = created_at AT TIME ZONE 'UTC'
WHERE transitioned_at IS NULL
  AND current_run_state IS NOT NULL;
