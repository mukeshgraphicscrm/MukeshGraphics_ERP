import React from 'react';
import { cn } from '../lib/utils';

export default function StatusBadge({ status }) {
  // Mapping status strings to semantic categories based on the prompt rules
  let semantic = 'info'; // default

  const successStatuses = ['Paid', 'Completed', 'Approved', 'In Stock', 'Delivered', 'Received', 'Won', 'Dispatched'];
  const warningStatuses = ['Pending', 'Loading', 'Low Stock', 'At Risk', 'Draft', 'Ordered', 'Follow Up', 'Negotiation'];
  const dangerStatuses = ['Overdue', 'Delayed', 'Low Stock alert', 'Correction Required', 'Lost'];
  const infoStatuses = ['In Production', 'Sent', 'Scheduled', 'Running', 'Under Review', 'In Transit', 'New Inquiry', 'Printing', 'Lamination', 'Punching', 'Striping', 'Pasting', 'Ready To Dispatch', 'QC Pending', 'Job Preparation', 'Ready For Dispatch'];

  if (successStatuses.includes(status)) semantic = 'success';
  else if (warningStatuses.includes(status)) semantic = 'warning';
  else if (dangerStatuses.includes(status)) semantic = 'danger';
  else if (infoStatuses.includes(status)) semantic = 'info';

  const styles = {
    success: 'bg-semantic-success-bg text-semantic-success-text',
    warning: 'bg-semantic-warning-bg text-semantic-warning-text',
    danger: 'bg-semantic-danger-bg text-semantic-danger-text',
    info: 'bg-semantic-info-bg text-semantic-info-text',
  };

  return (
    <span className={cn("px-2.5 py-1 text-xs font-medium rounded-full", styles[semantic])}>
      {status}
    </span>
  );
}
