// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

/**
 * Vendor marks and job-type glyphs of the Axis lineage UI, inlined as SVG in this one module.
 * The marks remain their owners' trademarks and are used only to identify the tool that runs
 * or defines a job. Each mark's source is noted beside it.
 */

import { JobGlyph } from './jobType'
import { faCog } from '@fortawesome/free-solid-svg-icons/faCog'
import React from 'react'

export type VendorId = 'oracle' | 'airflow' | 'databricks' | 'snowflake' | 'etleap' | 'dbt'

interface VendorMarkData {
  viewBox: string
  paths: { d: string; fill: string; fillRule?: 'evenodd'; opacity?: number }[]
}

const MARKS: Record<VendorId, VendorMarkData> = {
  // Source: Simple Icons (CC0), simple-icons/icons/oracle.svg, brand colour #F80000.
  oracle: {
    viewBox: '0 0 24 24',
    paths: [
      {
        fill: '#F80000',
        d: 'M16.412 4.412h-8.82a7.588 7.588 0 0 0-.008 15.176h8.828a7.588 7.588 0 0 0 0-15.176zm-.193 12.502H7.786a4.915 4.915 0 0 1 0-9.828h8.433a4.914 4.914 0 1 1 0 9.828z',
      },
    ],
  },
  // Source: apache/airflow official logo airflow_logo_light.svg (viewBox 0 0 175 175): the 8 coloured pinwheel paths, grey #51504f wordmark removed.
  airflow: {
    viewBox: '0 0 175 175',
    paths: [
      {
        fill: '#017cee',
        d: 'm4.186 172.44 82.21-84.271c.515-.528.614-1.345.184-1.944-5-6.98-14.224-8.19-17.642-12.88C58.81 59.451 56.24 51.588 51.888 52.076c-.303.034-.574.198-.788.416L21.401 82.937C4.316 100.45 1.866 139.01 1.417 171.298c-.02 1.459 1.75 2.186 2.769 1.142',
      },
      {
        fill: '#00ad46',
        d: 'm172.44 170.357-84.271-82.21c-.528-.515-1.345-.614-1.944-.185-6.98 5.001-8.19 14.224-12.88 17.643-13.893 10.127-21.756 12.697-21.268 17.049.034.304.198.575.416.788l30.444 29.699c17.513 17.085 56.073 19.535 88.361 19.984 1.459.021 2.186-1.749 1.142-2.768',
      },
      {
        fill: '#04d659',
        fillRule: 'evenodd',
        d: 'M82.936 153.141c-9.566-9.332-14.005-27.795 4.335-65.868-29.806 13.32-40.252 30.83-35.113 35.843z',
      },
      {
        fill: '#00c7d4',
        d: 'm170.355 2.105-82.21 84.271c-.515.528-.614 1.344-.184 1.944 5 6.98 14.224 8.19 17.642 12.88 10.128 13.892 12.698 21.755 17.049 21.268.304-.034.575-.198.789-.417l29.698-30.443c17.086-17.514 19.536-56.073 19.985-88.362.02-1.459-1.75-2.186-2.769-1.141',
      },
      {
        fill: '#11e1ee',
        fillRule: 'evenodd',
        d: 'M153.14 91.608c-9.333 9.566-27.796 14.005-65.87-4.336 13.321 29.807 30.831 40.253 35.844 35.114z',
      },
      {
        fill: '#e43921',
        d: 'm2.103 4.187 84.272 82.21c.527.515 1.344.614 1.943.185 6.98-5.001 8.19-14.224 12.88-17.643 13.893-10.127 21.756-12.697 21.268-17.049-.034-.304-.198-.575-.416-.788L91.606 21.403C74.093 4.318 35.533 1.868 3.245 1.419c-1.46-.02-2.186 1.75-1.142 2.768',
      },
      {
        fill: '#ff7557',
        fillRule: 'evenodd',
        d: 'M91.606 21.403c9.566 9.332 14.005 27.795-4.335 65.868 29.806-13.32 40.252-30.83 35.113-35.843z',
      },
      {
        fill: '#0cb6ff',
        fillRule: 'evenodd',
        d: 'M21.403 82.937c9.332-9.567 27.795-14.005 65.868 4.335-13.32-29.807-30.83-40.252-35.843-35.114z',
      },
    ],
  },
  // Source: Simple Icons (CC0), simple-icons/icons/databricks.svg, brand colour #FF3621.
  databricks: {
    viewBox: '0 0 24 24',
    paths: [
      {
        fill: '#FF3621',
        d: 'M.95 14.184L12 20.403l9.919-5.55v2.21L12 22.662l-10.484-5.96-.565.308v.77L12 24l11.05-6.218v-4.317l-.515-.309L12 19.118l-9.867-5.653v-2.21L12 16.805l11.05-6.218V6.32l-.515-.308L12 11.974 2.647 6.681 12 1.388l7.76 4.368.668-.411v-.566L12 0 .95 6.27v.72L12 13.207l9.919-5.55v2.26L12 15.52 1.516 9.56l-.565.308Z',
      },
    ],
  },
  // Source: Simple Icons (CC0), simple-icons/icons/snowflake.svg, brand colour #29B5E8.
  snowflake: {
    viewBox: '0 0 24 24',
    paths: [
      {
        fill: '#29B5E8',
        d: 'M24 3.459c0 .646-.418 1.18-1.141 1.18-.723 0-1.142-.534-1.142-1.18 0-.647.419-1.18 1.142-1.18.723 0 1.141.533 1.141 1.18zm-.228 0c0-.533-.38-.951-.913-.951s-.913.38-.913.95c0 .533.38.952.913.952.57 0 .913-.419.913-.951zm-1.37-.533h.495c.266 0 .456.152.456.38 0 .153-.076.229-.19.305l.19.266v.038h-.266l-.19-.266h-.229v.266h-.266zm.495.228h-.229v.267h.229c.114 0 .152-.038.152-.114.038-.077-.038-.153-.152-.153zM7.602 12.4c.038-.151.076-.304.076-.456 0-.114-.038-.228-.038-.342-.114-.343-.304-.647-.646-.838l-4.87-2.777c-.685-.38-1.56-.152-1.94.533-.381.685-.153 1.56.532 1.94l2.701 1.56-2.701 1.56c-.685.38-.913 1.256-.533 1.94.38.685 1.256.914 1.94.533l4.832-2.777c.343-.267.571-.533.647-.876zm1.332 2.626c-.266-.038-.57.038-.837.19l-4.832 2.777c-.685.38-.913 1.256-.532 1.94.38.686 1.255.914 1.94.533l2.701-1.56v3.12c0 .8.647 1.408 1.446 1.408.799 0 1.407-.647 1.407-1.408v-5.592c0-.761-.57-1.37-1.293-1.408zm4.946-6.088c.266.038.57-.038.837-.19l4.832-2.777c.685-.38.913-1.256.532-1.94-.38-.686-1.255-.914-1.94-.533l-2.701 1.56V1.975c0-.799-.647-1.408-1.446-1.408-.799 0-1.446.609-1.446 1.408V7.53c0 .76.609 1.37 1.332 1.407zM3.265 5.97l4.832 2.777c.266.152.533.19.837.19.723-.038 1.331-.684 1.331-1.407V1.975c0-.799-.646-1.408-1.407-1.408-.799 0-1.446.647-1.446 1.408v3.12l-2.701-1.56c-.685-.38-1.56-.152-1.94.533-.419.646-.19 1.521.494 1.902zm9.093 6.011a.412.412 0 00-.114-.266l-.57-.571a.346.346 0 00-.267-.114.412.412 0 00-.266.114l-.571.57a.411.411 0 00-.114.267c0 .076.038.19.114.267l.57.57a.345.345 0 00.267.114c.076 0 .19-.038.266-.114l.571-.57a.412.412 0 00.114-.267zm1.598.533L11.94 14.53c-.039.038-.153.114-.229.114h-.608a.411.411 0 01-.267-.114L8.82 12.514a.408.408 0 01-.076-.229v-.608c0-.076.038-.19.114-.267l2.016-2.016a.41.41 0 01.267-.114h.608a.41.41 0 01.267.114l2.016 2.016a.347.347 0 01.114.267v.608c-.076.077-.114.19-.19.229zm5.593 5.44l-4.832-2.777c-.266-.152-.57-.19-.837-.152-.723.038-1.332.684-1.332 1.408v5.554c0 .8.647 1.408 1.408 1.408.799 0 1.446-.647 1.446-1.408v-3.12l2.7 1.56c.686.38 1.561.152 1.941-.533.419-.646.19-1.521-.494-1.94zm2.549-7.533l-2.701 1.56 2.7 1.56c.686.38.914 1.256.533 1.94-.38.685-1.255.913-1.94.533l-4.832-2.778a1.644 1.644 0 01-.647-.798c-.037-.153-.076-.305-.076-.457 0-.114.039-.228.039-.342.114-.343.342-.647.646-.837l4.832-2.778c.685-.38 1.56-.152 1.94.533.457.609.19 1.484-.494 1.864',
      },
    ],
  },
  // Source: Etleap's own site favicon (etleap.svg): its two paths, drop-shadow filters removed, grey path at opacity .6.
  etleap: {
    viewBox: '0 0 32 34',
    paths: [
      {
        fill: '#00ADEE',
        d: 'm15.347 28.02-9.053-5.225v-8.779l8.643 4.997 2.11-3.645L8.39 10.37 16 5.98l8.566 4.952 4.77-2.111L16 1.122 2.087 9.155v16.07l13.26 7.654z',
      },
      {
        fill: '#ACACB7',
        opacity: 0.6,
        d: 'M25.706 11.86v10.935l-9.053 5.225v4.86l13.26-7.655V10.006z',
      },
    ],
  },
  // Source: Simple Icons (CC0), simple-icons/icons/dbt.svg, brand colour #FF694B.
  dbt: {
    viewBox: '0 0 24 24',
    paths: [
      {
        fill: '#FF694B',
        d: 'M17.9004 9.3763a8.1488 8.1488 0 0 0-3.0421-3.1206l1.7708.8385a10.2874 10.2874 0 0 1 3.74 3.0007l3.234-5.9295a2.8546 2.8546 0 0 0-.0611-2.9604C22.7566.0371 21.2112-.3409 19.9754.3327l-5.8749 3.2101a4.3612 4.3612 0 0 1-4.1761 0L4.1769.408a2.8545 2.8545 0 0 0-2.9592.0632c-1.1673.7853-1.5452 2.33-.8723 3.5655L3.55 9.9106a4.3612 4.3612 0 0 1 0 4.1772l-3.1272 5.743a2.86 2.86 0 0 0 .085 2.9974c.794 1.1438 2.3225 1.5054 3.5448.8385l6.0581-3.3049a10.2877 10.2877 0 0 1-3.0051-3.7454l-.8374-1.7708a8.148 8.148 0 0 0 3.1206 3.0421l10.5832 5.779c1.2213.666 2.7481.3055 3.5426-.8363a2.8699 2.8699 0 0 0 .0796-3.0018L17.9004 9.3763zm3.3801-7.7351c.6022 0 1.0904.4882 1.0904 1.0904s-.4882 1.0904-1.0904 1.0904-1.0904-.4882-1.0904-1.0904.4882-1.0904 1.0904-1.0904zM2.7442 3.822c-.6022 0-1.0904-.4882-1.0904-1.0904s.4882-1.0904 1.0904-1.0904 1.0904.4882 1.0904 1.0904S3.3464 3.822 2.7442 3.822zm0 18.5363c-.6022 0-1.0904-.4882-1.0904-1.0904 0-.6022.4882-1.0904 1.0904-1.0904s1.0904.4882 1.0904 1.0904c0 .6022-.4882 1.0904-1.0904 1.0904zm10.3585-11.4489c-1.2008-.0035-2.177.9672-2.1805 2.1679a2.1738 2.1738 0 0 0 .7052 1.6091c-1.4872-.2091-2.5234-1.5843-2.3142-3.0716.2091-1.4872 1.5843-2.5234 3.0716-2.3142a2.7194 2.7194 0 0 1 2.3142 2.3142 2.1623 2.1623 0 0 0-1.5963-.7054zm8.1778 11.4489c-.6022 0-1.0904-.4882-1.0904-1.0904 0-.6022.4882-1.0904 1.0904-1.0904s1.0904.4882 1.0904 1.0904c0 .6022-.4882 1.0904-1.0904 1.0904z',
      },
    ],
  },
}

export const isVendorId = (id: unknown): id is VendorId =>
  typeof id === 'string' && Object.prototype.hasOwnProperty.call(MARKS, id)

const MarkPaths = ({ id }: { id: VendorId }) => (
  <>
    {MARKS[id].paths.map((p, i) => (
      <path key={i} d={p.d} fill={p.fill} fillRule={p.fillRule} opacity={p.opacity} />
    ))}
  </>
)

/** A vendor's mark in its brand colours, `size` px square; nothing for an unknown id. */
export const VendorMark = ({ id, size = 13 }: { id: string; size?: number }) =>
  isVendorId(id) ? (
    <svg
      width={size}
      height={size}
      viewBox={MARKS[id].viewBox}
      role='img'
      aria-label={id}
      data-vendor={id}
    >
      <MarkPaths id={id} />
    </svg>
  ) : null

/**
 * The orchestrator badge: a white disc with the vendor's mark. A value the catalog has no icon
 * for gets a neutral disc (its name is in the tooltip).
 */
export const OrchestratorBadge = ({
  icon,
  size = 19,
  ring = '#171024',
}: {
  icon?: string
  size?: number
  ring?: string
}) => (
  <span
    data-testid='orchestrator-badge'
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: isVendorId(icon) ? '#fff' : '#9a8fab',
      boxShadow: `0 0 0 2px ${ring}`,
      display: 'grid',
      placeItems: 'center',
    }}
  >
    {isVendorId(icon) ? (
      <VendorMark id={icon} size={Math.round(size * 0.68)} />
    ) : (
      <span
        style={{ width: size / 3, height: size / 3, borderRadius: '50%', background: '#fff' }}
      />
    )}
  </span>
)

const RED = '#f26b5b'

/** The 34px job-type tile (design §4.4); `gear` is stock Marquez's job icon on a neutral tile. */
export const JobTypeTile = ({
  glyph,
  size = 34,
  neutral = { tile: '#2a2038', glyph: '#9a8fab' },
}: {
  glyph: JobGlyph
  size?: number
  /** The gear's tile and glyph colours: the stock job icon follows the colour scheme. */
  neutral?: { tile: string; glyph: string }
}) => {
  const tile = (fill: string, children: React.ReactNode) => (
    <svg width={size} height={size} viewBox='0 0 34 34' data-glyph={glyph} aria-hidden='true'>
      <rect width='34' height='34' rx='8' fill={fill} />
      {children}
    </svg>
  )
  switch (glyph) {
    case 'plsql':
      return tile(
        '#3a1f20',
        <>
          <ellipse cx='17' cy='9' rx='9' ry='3.2' fill='none' stroke={RED} strokeWidth='1.6' />
          <path
            d='M8 9v14c0 1.8 4 3.2 9 3.2s9-1.4 9-3.2V9'
            fill='none'
            stroke={RED}
            strokeWidth='1.6'
          />
          <text
            x='17'
            y='21'
            textAnchor='middle'
            fontSize='7.5'
            fontFamily='Menlo,monospace'
            fontWeight='700'
            fill='#ffb4a8'
          >
            PL/SQL
          </text>
        </>
      )
    case 'package':
      return tile(
        '#3a1f20',
        <path
          d='M17 6 27 11v12l-10 5-10-5V11z M7 11l10 5 10-5 M17 16v12'
          fill='none'
          stroke={RED}
          strokeWidth='1.6'
          strokeLinejoin='round'
        />
      )
    case 'trigger':
      return tile('#3a1f20', <path d='M19 5 9 19h7l-2 10 11-15h-7z' fill={RED} />)
    case 'dbt':
      return tile(
        '#3d2414',
        <g transform='translate(7 7) scale(.8333)'>
          <MarkPaths id='dbt' />
        </g>
      )
    case 'etleap':
      return tile(
        '#0c2a3a',
        <g transform='translate(7.5 6.4) scale(.6)'>
          <MarkPaths id='etleap' />
        </g>
      )
    case 'airflow':
      return tile(
        '#0d2233',
        <g transform='translate(7 7) scale(.1143)'>
          <MarkPaths id='airflow' />
        </g>
      )
    case 'notebook':
      return tile(
        '#3a1a12',
        <>
          <rect
            x='10'
            y='6'
            width='15'
            height='22'
            rx='2'
            fill='none'
            stroke='#ff7a3d'
            strokeWidth='1.6'
          />
          <path
            d='M8 11h4M8 17h4M8 23h4M15 12h7M15 16h7M15 20h5'
            stroke='#ff7a3d'
            strokeWidth='1.5'
            strokeLinecap='round'
          />
        </>
      )
    case 'sql':
      return tile(
        '#10283a',
        <text
          x='17'
          y='21.5'
          textAnchor='middle'
          fontSize='10'
          fontFamily='Menlo,monospace'
          fontWeight='700'
          fill='#7cc8f2'
        >
          SQL
        </text>
      )
    default: {
      const [w, h, , , path] = faCog.icon
      return tile(
        neutral.tile,
        <g transform={`translate(9 9) scale(${16 / Math.max(w, h)})`}>
          <path d={Array.isArray(path) ? path.join(' ') : path} fill={neutral.glyph} />
        </g>
      )
    }
  }
}
