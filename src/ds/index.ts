/**
 * meatspace.sh design system v1.0 "Instrument": the component library.
 * API reference: src/ds/README.md. Living reference: src/pages/DesignPage.tsx.
 * Status vocabulary (lamps, /v1 status fields, man page): shared/status.ts.
 */
export { Lamp, Annunciator, type LampProps } from './Lamp'
export { Num, type NumProps, type Provenance } from './Num'
export { Key, Button, type KeyProps, type KeyVariant, type KeyBusy } from './Key'
export { Reading, Readout, type ReadingProps } from './Reading'
export { Field, Input, Select, Textarea, Check, FieldGrid, type FieldProps, type CheckProps } from './Field'
export { Tabs, ModeSwitch, ChannelKeys, type TabItem, type TabsProps, type ModeOption } from './Tabs'
export { Table, ScrollBox, type Column, type TableProps } from './Table'
export { CodeBlock, CurlBlock, CopyKey, CommandLine, type CodeBlockProps, type CurlBlockProps } from './Code'
export { curlCommand } from './curl'
export { Console, type ConsoleEvent, type ConsoleProps } from './Console'
export { Callout, type CalloutProps, type CalloutRegister } from './Callout'
export { Dialog, type DialogProps } from './Dialog'
export { Panel, SectionHeader, Ruler, Figure, type PanelProps, type SectionHeaderProps, type FigureProps } from './Panel'
export {
  Seal,
  TitleBlock,
  ProvenanceFrame,
  CheckPoll,
  CertificateHeader,
  Ids,
  type SealProps,
  type TitleField,
  type ProvenanceCell,
  type PollRow,
  type CertificateHeaderProps,
} from './Certificate'
export {
  SkipLink,
  StatusLine,
  Ledger,
  SignalChain,
  ConceptBanner,
  RevisionTable,
  IntervalMeter,
  type StatusLineItem,
  type ChainStep,
  type Revision,
  type IntervalMeterProps,
} from './Blocks'

// Data-viz
export { ScopePlot, TraceTable, type ScopePlotProps } from './viz/ScopePlot'
export { ScopeStrips, type ScopeStripsProps } from './viz/ScopeStrips'
export { CIBars, type CIBarRow, type CIBarsProps } from './viz/CIBars'
export { LagReadout, type LagReadoutProps } from './viz/LagReadout'
export { PowerSelector, type PowerSelectorProps } from './viz/PowerSelector'
export { Graticule, CursorDot } from './viz/Graticule'
export { CHANNEL_LABEL, CHANNEL_WORD, ALL_CHANNELS, type Channel, type ChannelVisibility, type Traces, type JointTraces, type Interval } from './viz/types'

// Hooks and pure helpers
export { useContainerWidth, useOverflowA11y, useReducedMotion, useElapsed, usePlayhead, useFocusReturn, type Playhead, type PlayheadGeometry } from './hooks'
export * from './format'
export * as dsMath from './math'
