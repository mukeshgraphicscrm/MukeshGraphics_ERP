import React from 'react';
import { cn } from '../lib/utils';

export default function StatusBadge({ status }) {
  let semantic = 'info'; // default
  let customStyle = '';

  const statusUpper = typeof status === 'string' ? status.toUpperCase() : '';

  if (['PAID', 'COMPLETED', 'APPROVED', 'IN STOCK', 'DELIVERED', 'RECEIVED', 'WON', 'DISPATCHED'].includes(statusUpper)) {
    semantic = 'success';
  } else if (['PENDING', 'LOADING', 'LOW STOCK', 'AT RISK', 'DRAFT', 'ORDERED', 'FOLLOW UP', 'NEGOTIATION'].includes(statusUpper)) {
    semantic = 'warning';
  } else if (['OVERDUE', 'DELAYED', 'LOW STOCK ALERT', 'CORRECTION REQUIRED', 'LOST', 'CANCELLED'].includes(statusUpper)) {
    semantic = 'danger';
  } else if (['OUT FOR DELIVERY'].includes(statusUpper)) {
    semantic = 'purple';
  } else if (['IN PRODUCTION', 'SENT', 'SCHEDULED', 'RUNNING', 'UNDER REVIEW', 'IN TRANSIT', 'NEW INQUIRY', 'PRINTING', 'LAMINATION', 'PUNCHING', 'STRIPING', 'PASTING', 'READY TO DISPATCH', 'QC PENDING', 'JOB PREPARATION', 'READY FOR DISPATCH'].includes(statusUpper)) {
    semantic = 'info';
  }

  const styles = {
    success: 'bg-semantic-success-bg text-semantic-success-text',
    warning: 'bg-semantic-warning-bg text-semantic-warning-text',
    danger: 'bg-semantic-danger-bg text-semantic-danger-text',
    info: 'bg-semantic-info-bg text-semantic-info-text',
    purple: 'bg-purple-100 text-purple-700',
  };

  return (
    <span className={cn("px-2.5 py-1 text-xs font-medium rounded-full", styles[semantic] || styles.info)}>
      {status}
    </span>
  );
}
