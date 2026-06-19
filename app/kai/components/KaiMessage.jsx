import KaiAvatar from './KaiAvatar';
import InfoCard3Col from './InfoCard3Col';
import HypothesisGrid from './HypothesisGrid';
import ProfilePlanCard from './ProfilePlanCard';
import TransferCard from './TransferCard';

function RichComponent({ component }) {
  if (!component) return null;

  switch (component.type) {
    case 'knowledge_summary':
      return <InfoCard3Col data={component.data} />;
    case 'hypotheses':
      return <HypothesisGrid data={component.data} />;
    case 'business_profile':
      return (
        <>
          <ProfilePlanCard data={component.data} />
          {component.data?.requestAria && <TransferCard />}
        </>
      );
    default:
      return null;
  }
}

export function KaiTypingIndicator() {
  return (
    <div className="kai-msg kai-msg-kai">
      <KaiAvatar size={32} state="thinking" />
      <div className="kai-msg-body">
        <div className="kai-msg-header">
          <span className="kai-msg-name">Kai</span>
          <span className="kai-msg-analyzing">
            <span className="kai-status-dot kai-status-dot-pulse" />
            Analizando
          </span>
        </div>
        <div className="kai-msg-typing">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

export default function KaiMessage({ message }) {
  if (message.role === 'user') {
    return (
      <div className="kai-msg kai-msg-user">
        <div className="kai-msg-user-bubble">{message.content}</div>
      </div>
    );
  }

  return (
    <div className="kai-msg kai-msg-kai">
      <KaiAvatar size={32} />
      <div className="kai-msg-body">
        <div className="kai-msg-header">
          <span className="kai-msg-name">Kai</span>
        </div>
        {message.content && <p className="kai-msg-text">{message.content}</p>}
        <RichComponent component={message.component} />
      </div>
    </div>
  );
}
