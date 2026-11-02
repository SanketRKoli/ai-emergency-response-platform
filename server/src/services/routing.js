// Which responder group handles which incident category.
export const ROUTING = {
  Fire: 'Fire',
  Medical: 'Medical',
  Security: 'Security',
  Accident: 'Accident',
  Infrastructure: 'Infrastructure',
  Maintenance: 'Infrastructure', // maintenance problems go to the infrastructure team
  Other: 'Other',
};
export const routeGroup = (category) => ROUTING[category] || 'Other';
