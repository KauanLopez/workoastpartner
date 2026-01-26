import React from 'react';
import { CandidateStatus } from '../types';

interface Props {
  status: CandidateStatus;
}

const CandidateStatusBadge: React.FC<Props> = ({ status }) => {
  let styles = '';


  switch (status) {
    case CandidateStatus.AVAILABLE:
      styles = 'bg-green-100 text-green-800 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20';
      break;
    case CandidateStatus.INTERVIEWING:
      styles = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
      break;
    case CandidateStatus.HIRED:
      styles = 'bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700';
      break;
    case CandidateStatus.OFFER:
      styles = 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
      break;
    default:
      styles = 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-surface-highlight dark:text-gray-400 dark:border-border-dark';
  }

  return (
    <div className={`inline-flex items-center justify-center rounded-full px-3 py-1 border text-xs font-bold uppercase tracking-wider ${styles}`}>
      {status}
    </div>
  );
};

export default CandidateStatusBadge;