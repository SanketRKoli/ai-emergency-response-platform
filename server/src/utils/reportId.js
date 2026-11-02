import Counter from '../models/Counter.js';

export const formatReportId = (year, seq) => `INC-${year}-${String(seq).padStart(4, '0')}`;

// $inc on one document is atomic, so two reports submitted at the same moment never get the same number.
export async function generateReportId() {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { _id: `incident-${year}` },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
  );
  return formatReportId(year, counter.seq);
}
