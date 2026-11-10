import Crest from './Crest.jsx';

// Clubs used to be marked by a thin stripe of their colour. A white stripe on
// a white card is nothing at all, and half the Championship shares red, so
// everywhere that drew a stripe now draws the crest.
export default function Stripe({ team, variant = 'inline' }) {
  return <Crest team={team} size={variant === 'tbl' ? 18 : 20} />;
}
