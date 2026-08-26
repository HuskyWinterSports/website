import { useState, useEffect } from 'react';

/**
 * The photo carousel, used on the home page and for the history archive.
 *
 * The governing idea is that the frame adapts to the photo rather than the
 * photo being cut to fit the frame. Every slide shows the whole photograph,
 * fitted inside the band, over a blurred and darkened copy of itself.
 *
 * That is not decoration. The photos come from a Drive folder officers fill
 * themselves, and measuring the club's own folder found four different shapes
 * in it — 4:3 phone shots, 3:2 camera shots, a 604 px archival scan and three
 * portraits. A cropping frame has to pick one of those and mangle the rest;
 * the version this replaced threw away 43% of every group photo, taking the
 * back row's heads and the year painted across the sky with it. Fitting means
 * nobody has to know the rules before uploading, which is the whole point.
 */

/**
 * How wide the photo will actually be drawn, as a sizes expression.
 *
 * `loading="lazy"` is no help to a carousel — every slide is stacked inside
 * the viewport, just transparent, so the browser considers them all visible.
 * And a fitted photo is much narrower than the band that holds it: a 4:3 shot
 * in this band covers about 46% of a wide screen, so telling the browser
 * "100vw" makes it fetch a file more than twice the size it needs. This says
 * what will really be drawn: the band's height times the photo's own shape,
 * never more than the screen.
 *
 * Keep in step with `.image-slider { height }` in Home.css.
 */
const sizesFor = (ratio) => `(max-width: 700px) 100vw, min(100vw, calc(min(620px, 46vw) * ${ratio}))`;

export default function Slider({ slides, caption }) {
    const [index, setIndex] = useState(0);

    // Which slides have had their images attached. Every slide is in the DOM
    // from the start so the crossfade has something to fade to, but a slide
    // nobody has looked at yet costs nothing to download.
    const [loaded, setLoaded] = useState(() => new Set([0]));

    const step = (by) => setIndex((i) => (i + by + slides.length) % slides.length);
    const current = slides[index];

    useEffect(() => {
        // The one on screen, and the two either side of it so that pressing an
        // arrow is instant. Queued behind the first paint rather than racing
        // it: the visible photo is what the visitor is waiting for.
        const near = [index, index + 1, index - 1]
            .map((i) => (i + slides.length) % slides.length);
        const attach = () => setLoaded((was) => {
            if (near.every((i) => was.has(i))) return was;
            return new Set([...was, ...near]);
        });
        const id = requestAnimationFrame(() => setTimeout(attach, 0));
        return () => cancelAnimationFrame(id);
    }, [index, slides.length]);

    return (
        <figure className="image-slider-figure">
            <div
                className="image-slider"
                onKeyDown={(event) => {
                    if (event.key === 'ArrowLeft') { step(-1); event.preventDefault(); }
                    if (event.key === 'ArrowRight') { step(1); event.preventDefault(); }
                }}
            >
                {slides.map((slide, i) => (
                    <div
                        key={slide.src}
                        className={`slide ${i === index ? 'active' : ''}`}
                        aria-hidden={i === index ? 'false' : 'true'}
                    >
                        {loaded.has(i) && (
                            <>
                                {/* Decorative: the same photo, out of focus,
                                    filling the band either side of it. Always
                                    the smallest file. */}
                                <img className="slide-wash" src={slide.wash} alt="" aria-hidden="true" />
                                <img
                                    className="slide-photo"
                                    style={{ maxWidth: `min(100%, ${slide.width}px)` }}
                                    src={slide.src}
                                    srcSet={slide.srcset}
                                    sizes={sizesFor(slide.ratio)}
                                    alt={slide.alt}
                                    fetchPriority={i === 0 ? 'high' : 'auto'}
                                    decoding="async"
                                />
                            </>
                        )}
                    </div>
                ))}

                {slides.length > 1 && (
                    <>
                        <button className="left-arrow" aria-label="Previous photo" onClick={() => step(-1)}>
                            &#10094;
                        </button>
                        <button className="right-arrow" aria-label="Next photo" onClick={() => step(1)}>
                            &#10095;
                        </button>

                        {/* Six years of group photos need a sense of how many
                            there are and where you are; three did not. */}
                        <div className="slide-dots">
                            {slides.map((slide, i) => (
                                <button
                                    key={slide.src}
                                    className={`slide-dot ${i === index ? 'current' : ''}`}
                                    aria-label={`Photo ${i + 1} of ${slides.length}`}
                                    aria-current={i === index ? 'true' : 'false'}
                                    onClick={() => setIndex(i)}
                                />
                            ))}
                        </div>
                    </>
                )}

                {caption && (
                    <div className="caption-text">
                        <h2>{caption}</h2>
                    </div>
                )}
            </div>

            {/* Sits below the photograph rather than over it: three of the
                club's history photos have no year visible anywhere in the
                image, so the name of the file is the only thing that dates
                them. */}
            {current?.caption && (
                <figcaption className="slide-year" aria-live="polite">{current.caption}</figcaption>
            )}
        </figure>
    );
}
