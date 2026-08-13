import { useState } from 'react';

/**
 * The home page photo carousel.
 *
 * Lifted out of Home.jsx unchanged when that page moved to the document. The
 * photos are a layout concern — they live in content/home.layout.json, so
 * swapping in this season's group shot is a one-line change and does not
 * involve an officer pasting an image into a Google Doc.
 */
export default function Slider({ slides, caption }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const step = (by) =>
        setCurrentIndex((index) => (index + by + slides.length) % slides.length);

    return (
        <section className="image-slider">
            {slides.map((slide, index) => (
                <div
                    key={slide.url}
                    className={`slide ${index === currentIndex ? 'active' : ''}`}
                    style={{ backgroundImage: `url(${slide.url})` }}
                    role="img"
                    aria-label={slide.alt}
                    aria-hidden={index === currentIndex ? 'false' : 'true'}
                />
            ))}

            <button className="left-arrow" aria-label="Previous photo" onClick={() => step(-1)}>
                &#10094;
            </button>
            <button className="right-arrow" aria-label="Next photo" onClick={() => step(1)}>
                &#10095;
            </button>

            {caption && (
                <div className="caption-text">
                    <h2>{caption}</h2>
                </div>
            )}
        </section>
    );
}
