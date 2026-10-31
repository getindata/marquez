import { ArrowBackIosRounded } from '@mui/icons-material'
import { AxisTokens, useAxisTokens } from '../../theme'
import { FormControlLabel, Switch } from '@mui/material'
import { HEADER_HEIGHT } from '../../helpers/theme'
import { fetchLineage } from '../../store/actionCreators'
import { truncateText } from '../../helpers/text'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import MQTooltip from '../../components/core/tooltip/MQTooltip'
import React from 'react'

interface ActionBarProps {
  nodeType: 'DATASET' | 'JOB'
  fetchLineage: typeof fetchLineage
  depth: number
  setDepth: (depth: number) => void
  isCompact: boolean
  setIsCompact: (isCompact: boolean) => void
  isFull: boolean
  setIsFull: (isFull: boolean) => void
  /** Hidden when the namespace has no layer catalog. */
  showLayers?: boolean
  activeLayerCount?: number
  layersOpen?: boolean
  onToggleLayers?: () => void
}

/** The stacked-squares icon of the Layers button. */
const LayersIcon = () => (
  <svg
    width={15}
    height={15}
    viewBox='0 0 16 16'
    fill='none'
    stroke='currentColor'
    strokeWidth={1.3}
    strokeLinejoin='round'
    aria-hidden='true'
  >
    <path d='M8 1.5 14.5 5 8 8.5 1.5 5z' />
    <path d='M1.5 8 8 11.5 14.5 8' />
    <path d='M1.5 11 8 14.5 14.5 11' />
  </svg>
)

const squareButton = (t: AxisTokens) => ({
  width: 24,
  height: 24,
  border: `1px solid ${t.line}`,
  borderRadius: '4px',
  background: 'none',
  color: t.text,
  cursor: 'pointer',
  font: 'inherit',
  padding: 0,
})

export const ActionBar = ({
  nodeType,
  depth,
  setDepth,
  isCompact,
  setIsCompact,
  isFull,
  setIsFull,
  showLayers = false,
  activeLayerCount = 0,
  layersOpen = false,
  onToggleLayers,
}: ActionBarProps) => {
  const t = useAxisTokens()
  const { namespace, name } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const changeDepth = (next: number) => {
    const value = Math.max(0, next)
    setDepth(value)
    searchParams.set('depth', String(value))
    setSearchParams(searchParams)
  }

  const switchLabel = (text: string) => (
    <Box component='span' sx={{ color: t.muted, fontSize: 13 }}>
      {text}
    </Box>
  )

  return (
    <Box
      display={'flex'}
      height={HEADER_HEIGHT - 1}
      alignItems={'center'}
      gap={'18px'}
      px={'18px'}
      sx={{
        background: t.actionBar,
        borderBottom: `1px solid ${t.line}`,
        color: t.text,
        fontFamily: t.font,
        fontSize: 13,
      }}
    >
      <Box display={'flex'} alignItems={'center'} minWidth={0}>
        <MQTooltip title={`Back to ${nodeType === 'JOB' ? 'jobs' : 'datasets'}`}>
          <IconButton
            size={'small'}
            sx={{ mr: 1, color: t.muted }}
            onClick={() => navigate(nodeType === 'JOB' ? '/' : '/datasets')}
          >
            <ArrowBackIosRounded fontSize={'small'} />
          </IconButton>
        </MQTooltip>
        <Box component='span' sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
          {nodeType === 'JOB' ? 'Jobs' : 'Datasets'}
          <Box
            component='span'
            sx={{ fontFamily: t.mono, fontWeight: 400, color: t.muted, ml: '6px' }}
          >
            {namespace ? truncateText(namespace, 40) : 'unknown namespace'} /{' '}
            {name ? truncateText(name, 60) : 'unknown name'}
          </Box>
        </Box>
      </Box>
      <Box flex={1} />
      {showLayers && (
        <button
          type='button'
          aria-pressed={layersOpen}
          aria-label='Layers'
          onClick={onToggleLayers}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            border: `1px solid ${layersOpen ? t.accent : t.line}`,
            boxShadow: layersOpen ? `0 0 0 1px ${t.accent}` : 'none',
            borderRadius: 6,
            padding: '5px 11px',
            color: t.text,
            background: 'none',
            font: 'inherit',
            cursor: 'pointer',
          }}
        >
          <LayersIcon />
          Layers
          <i
            data-testid='layers-count'
            style={{
              fontStyle: 'normal',
              fontSize: 11,
              background: t.accentFill,
              color: t.accentFillText,
              borderRadius: 9,
              padding: '0 6px',
              minWidth: 18,
              textAlign: 'center',
            }}
          >
            {activeLayerCount}
          </i>
        </button>
      )}
      <Box display={'flex'} alignItems={'center'} gap={'6px'} sx={{ color: t.muted }}>
        Depth
        <button
          type='button'
          aria-label='Decrease depth'
          style={squareButton(t)}
          onClick={() => changeDepth(depth - 1)}
        >
          −
        </button>
        <Box
          component='b'
          id='column-level-depth'
          sx={{
            minWidth: 28,
            textAlign: 'center',
            border: `1px solid ${t.line}`,
            borderRadius: '4px',
            p: '2px 6px',
            color: t.text,
            fontWeight: 500,
          }}
        >
          {depth}
        </Box>
        <button
          type='button'
          aria-label='Increase depth'
          style={squareButton(t)}
          onClick={() => changeDepth(depth + 1)}
        >
          +
        </button>
      </Box>
      <FormControlLabel
        sx={{ m: 0, gap: '4px' }}
        control={
          <Switch
            size={'small'}
            checked={isFull}
            onChange={(_, checked) => {
              setIsFull(checked)
              searchParams.set('isFull', checked.toString())
              setSearchParams(searchParams)
            }}
          />
        }
        label={switchLabel('Full graph')}
      />
      <FormControlLabel
        sx={{ m: 0, gap: '4px' }}
        control={
          <Switch
            size={'small'}
            checked={isCompact}
            onChange={(_, checked) => {
              setIsCompact(checked)
              searchParams.set('isCompact', checked.toString())
              setSearchParams(searchParams)
            }}
          />
        }
        label={switchLabel('Compact nodes')}
      />
    </Box>
  )
}
