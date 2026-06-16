import HeadlineAlert from './HeadlineAlert';
import ActionItemsList from './ActionItemsList';
import AdvisoryRationale from './AdvisoryRationale';
import FollowUpChips from './FollowUpChips';

export default function AdvisoryPresentation({ advisory, onFollowUp, disabled }) {
  if (!advisory) return null;

  const { risk, decisions, justification, immediatePlan, followUps } = advisory;

  return (
    <div className="aria-presentation">
      {risk && <HeadlineAlert headline={{ status: risk.status, title: risk.title, impact: risk.description }} />}
      <ActionItemsList actionItems={decisions} title="Decisiones recomendadas" />
      <AdvisoryRationale justification={justification} immediatePlan={immediatePlan} />
      <FollowUpChips followUps={followUps} onSelect={onFollowUp} disabled={disabled} />
    </div>
  );
}
