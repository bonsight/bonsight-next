import HeadlineAlert from './HeadlineAlert';
import KpiGrid from './KpiGrid';
import TrendChart from './TrendChart';
import InsightsList from './InsightsList';
import ActionItemsList from './ActionItemsList';
import ConfidenceIndicator from './ConfidenceIndicator';
import FullAnalysisPanel from './FullAnalysisPanel';
import DataSourcesPanel from './DataSourcesPanel';
import FollowUpChips from './FollowUpChips';
import FeedbackButtons from './FeedbackButtons';

export default function AnalysisPresentation({ presentation, onFollowUp, disabled }) {
  if (!presentation) return null;

  const { headline, summary, kpis, trendChart, insights, actionItems, confidence, followUps, dataSources } =
    presentation;

  return (
    <div className="aria-presentation">
      <HeadlineAlert headline={headline} />
      <ConfidenceIndicator confidence={confidence} />
      <KpiGrid kpis={kpis} />
      <TrendChart trendChart={trendChart} />
      <InsightsList insights={insights} />
      <ActionItemsList actionItems={actionItems} />
      <FullAnalysisPanel summary={summary} />
      <DataSourcesPanel dataSources={dataSources} basisMetrics={confidence?.basisMetrics} />
      <FollowUpChips followUps={followUps} onSelect={onFollowUp} disabled={disabled} />
      <FeedbackButtons />
    </div>
  );
}
