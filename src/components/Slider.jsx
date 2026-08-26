import { useState, useEffect, useRef, useCallback } from 'react';

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
 *
 * It wraps: past the last photo is the first one again, and that one move goes
 * straight there rather than sliding, because sweeping back across six
 * photographs to reach the seventh reads as the page running away.
 *
 * It moves sideways, as a scroll-snapping track rather than a crossfade. That
 * is what makes it swipeable on a phone and two-finger scrollable on a
 * trackpad without a line of code for either — the browser already knows how
 * to scroll. The arrows and dots drive the same scroll, so there is one notion
 * of where you are rather than two that can disagree.
 */

/**
 * How wide the photo will actually be drawn, as a sizes expression.
 *
 * `loading="lazy"` is not trusted here — measured at 1842 KB on the home page
 * when every slide was allowed to load — and a fitted photo is much narrower
 * than the band that holds it: a 4:3 shot covers about 46% of a wide screen,
 * so telling the browser "100vw" makes it fetch a file more than twice the
 * size it needs. This says what will really be drawn: the band's height times
 * the photo's own shape, never more than the screen.
 *
 * Keep in step with `.image-slider { height }` in Home.css.
 */
const sizesFor = (ratio) => `(max-width: 700px) 100vw, min(100vw, calc(min(620px, 46vw) * ${ratio}))`;

export default function Slider({ slides, caption }) {
    const track = useRef(null);
    const [index, setIndex] = useState(0);

    // Which slides have had their images attached. Every slide is in the track
    // from the start so the scroll has somewhere to go, but a slide nobody has
    // reached yet costs nothing to download.
    const [loaded, setLoaded] = useState(() => new Set([0]));

    const goTo = useCallback((next) => {
        const el = track.current;
        if (!el) return;

        // Wrapped: the last photo's right arrow goes back to the first. The
        // ends of the run are not interesting enough to stop at, and an arrow
        // that does nothing is a worse answer than one that starts over.
        const to = (next + slides.length) % slides.length;

        // But the wrap itself is a jump, not a scroll. Sliding from the last
        // photo to the first sweeps past every photo in between, which reads
        // as the page running away from you; going straight there reads as
        // starting again, which is what it is.
        //
        // Only the wrap passes `behavior`. An ordinary move leaves it unset so
        // the CSS `scroll-behavior` decides, and that is `auto` under
        // prefers-reduced-motion — naming 'smooth' here would animate for
        // exactly the people who asked it not to.
        const left = to * el.clientWidth;
        el.scrollTo(next === to ? { left } : { left, behavior: 'instant' });
    }, [slides.length]);

    // The scroll position is the source of truth: a swipe, a trackpad, the
    // arrows and the dots all move the same thing, so nothing can disagree
    // about which photo is showing.
    const onScroll = () => {
        const el = track.current;
        if (!el || !el.clientWidth) return;
        const at = Math.round(el.scrollLeft / el.clientWidth);
        setIndex((was) => (at === was ? was : Math.min(at, slides.length - 1)));
    };

    useEffect(() => {
        // The one on screen, and the two either side of it: on a sideways
        // track a neighbour is partly visible the moment a swipe begins.
        const near = [index, index + 1, index - 1]
            .map((i) => (i + slides.length) % slides.length);
        const id = requestAnimationFrame(() => setLoaded((was) => (
            near.every((i) => was.has(i)) ? was : new Set([...was, ...near])
        )));
        return () => cancelAnimationFrame(id);
    }, [index, slides.length]);

    return (
        <figure className="image-slider-figure">
            <div className="image-slider">
                <div
                    className="slide-track"
                    ref={track}
                    onScroll={onScroll}
                    tabIndex={0}
                    role="group"
                    aria-roledescription="carousel"
                    aria-label={caption ?? 'Photos'}
                    onKeyDown={(event) => {
                        // Handled rather than left to the browser: native
                        // arrow-key scrolling moves by a fixed step and can
                        // leave the track between two photos.
                        if (event.key === 'ArrowLeft') { goTo(index - 1); event.preventDefault(); }
                        if (event.key === 'ArrowRight') { goTo(index + 1); event.preventDefault(); }
                    }}
                >
                    {slides.map((slide, i) => (
                        <div
                            key={slide.src}
                            className="slide"
                            role="group"
                            aria-roledescription="slide"
                            aria-label={`${i + 1} of ${slides.length}`}
                        >
                            {loaded.has(i) && (
                                <>
                                    {/* Decorative: the same photo, out of
                                        focus, filling the band either side of
                                        it. Always the smallest file. */}
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
                </div>

                {slides.length > 1 && (
                    <>
                        <button
                            className="left-arrow"
                            aria-label="Previous photo"
                            onClick={() => goTo(index - 1)}
                        >&#10094;</button>
                        <button
                            className="right-arrow"
                            aria-label="Next photo"
                            onClick={() => goTo(index + 1)}
                        >&#10095;</button>

                        {/* Seven years of group photos need a sense of how
                            many there are and where you are; three did not. */}
                        <div className="slide-dots">
                            {slides.map((slide, i) => (
                                <button
                                    key={slide.src}
                                    className={`slide-dot ${i === index ? 'current' : ''}`}
                                    aria-label={`Photo ${i + 1} of ${slides.length}`}
                                    aria-current={i === index ? 'true' : 'false'}
                                    onClick={() => goTo(i)}
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
            {slides[index]?.caption && (
                <figcaption className="slide-year" aria-live="polite">{slides[index].caption}</figcaption>
            )}
        </figure>
    );
}
