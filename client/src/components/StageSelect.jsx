import { STAGES, STAGE_STYLES } from '../lib/constants';
import { Icon } from './Icon';

// A stage badge that is also a dropdown: change the stage without opening the form
export function StageSelect({ value, onChange, disabled }) {
  const s = STAGE_STYLES[value];
  return (
    <div className={`relative inline-flex items-center rounded-full ring-1 ring-inset ${s.badge}`}>
      <span className={`pointer-events-none absolute left-2.5 size-1.5 rounded-full ${s.dot}`} />
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} aria-label="Change stage"
        className="cursor-pointer appearance-none rounded-full bg-transparent py-0.5 pl-6 pr-7 text-xs font-medium focus:outline-none disabled:cursor-wait">
        {STAGES.map((st) => <option key={st}>{st}</option>)}
      </select>
      <Icon name="chevronDown" className="pointer-events-none absolute right-2 size-3 opacity-60" />
    </div>
  );
}
