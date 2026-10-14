import React from 'react';
import { CandidateStatus } from '../types';
import { Badge, BadgeTone } from './ui/Badge';

interface Props {
  status: CandidateStatus | string;
  size?: 'sm' | 'md';
}

const CandidateStatusBadge: React.FC<Props> = ({ status, size = 'sm' }) => {
  let tone: BadgeTone = 'neutral';

  switch (status) {
    case CandidateStatus.AVAILABLE:
      tone = 'success';
      break;
    case CandidateStatus.INTERVIEWING:
      tone = 'info';
      break;
    case CandidateStatus.HIRED:
      tone = 'neutral';
      break;
    case CandidateStatus.OFFER:
      tone = 'warning';
      break;
    default:
      tone = 'neutral';
  }

  return (
    <Badge tone={tone} size={size} dot>
      {status}
    </Badge>
  );
};

export default CandidateStatusBadge;