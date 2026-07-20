import { getActivityByCode } from '@/lib/kai/activities';
import ActivityParticipantChat from './ActivityParticipantChat';
import '../activity.css';

export async function generateMetadata({ params }) {
  const { code } = await params;
  const ref = await getActivityByCode(code);
  return {
    title: ref ? `${ref.meta.name} · Kai` : 'Activity · Kai',
    robots: { index: false, follow: false },
  };
}

export default async function ActivityJoinPage({ params }) {
  const { code } = await params;
  const ref = await getActivityByCode(code);

  if (!ref) {
    return (
      <div className="act-wrap act-wrap--center">
        <div className="act-panel">
          <h1 className="act-panel-title">No encontramos esta actividad</h1>
          <p className="act-panel-text">El código o el link puede haber expirado. Pedile al organizador que te comparta uno nuevo.</p>
        </div>
      </div>
    );
  }

  if (ref.meta.status === 'finished') {
    return (
      <div className="act-wrap act-wrap--center">
        <div className="act-panel">
          <h1 className="act-panel-title">"{ref.meta.name}" ya finalizó</h1>
          <p className="act-panel-text">Gracias por tu interés — esta actividad ya no acepta respuestas.</p>
        </div>
      </div>
    );
  }

  return (
    <ActivityParticipantChat
      code={code}
      activityId={ref.activityId}
      activityName={ref.meta.name}
    />
  );
}
