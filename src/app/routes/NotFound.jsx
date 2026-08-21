import { Link } from 'react-router-dom';

export default function NotFound() {
    return (
        <section className='big-white-box'>
            <h1>Page Not Found</h1>
            <div className='centered-text'>
                <p>Sorry, we couldn&rsquo;t find that page. It may have moved.</p>
                <p>
                    Try our <Link to="/lesson-info">lesson information</Link>, or{' '}
                    <Link to="/contact-us">get in touch</Link> and we&rsquo;ll help.
                </p>
            </div>
        </section>
    );
}
