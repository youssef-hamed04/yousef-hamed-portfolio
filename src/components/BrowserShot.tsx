type Props = {
  image: string;
  url: string;
  alt: string;
  href?: string;
};

// A screenshot in a browser frame. Hovering scrolls a tall screenshot from top to bottom.
export function BrowserShot({ image, url, alt, href }: Props) {
  const body = (
    <>
      <div className="shot-bar" aria-hidden="true">
        <i />
        <i />
        <i />
        <span>{url}</span>
      </div>
      <div className="shot-view">
        <div className="shot-inner">
          <img src={image} alt={alt} loading="lazy" decoding="async" />
        </div>
      </div>
    </>
  );

  return href ? (
    <a className="shot" href={href} target="_blank" rel="noreferrer" data-cursor="Open">
      {body}
    </a>
  ) : (
    <div className="shot">{body}</div>
  );
}
