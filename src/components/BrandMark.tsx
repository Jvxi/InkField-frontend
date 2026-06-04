interface BrandMarkProps {
  size?: number;
  className?: string;
}

export default function BrandMark(props: BrandMarkProps): JSX.Element {
  const size = props.size ?? 32;
  const className = props.className ? `brand-mark ${props.className}` : "brand-mark";

  return <img className={className} src="/favicon.svg" alt="" width={size} height={size} aria-hidden />;
}
