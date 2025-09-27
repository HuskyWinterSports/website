import '../../assets/Global.css'

export default function JoinMailingList() {
    return (
        <>
        <section className='big-white-box'>
            <h1>Email List</h1>
            <div className='centered-text'>
                <p>There's snow on the ground and it's snowing in the mountains! We hope you're just as excited about skiing as we are. Join our emailing list to be notified of lesson registration openings and updates.</p>
                <p>Click <a href='https://docs.google.com/forms/d/e/1FAIpQLSc1_veiFKbR2i3uqTdNQiR-5MZxLvLj_nbssYcrqqwfMsR0PA/viewform?usp=sf_link' target='blank'>here</a> to open the form in a new window.</p>
            </div>
            <iframe className='small-form' src="https://docs.google.com/forms/d/e/1FAIpQLSc1_veiFKbR2i3uqTdNQiR-5MZxLvLj_nbssYcrqqwfMsR0PA/viewform?embedded=true" width="250" height="300" frameborder="0" marginheight="0" marginwidth="0">Loading…</iframe>
            <iframe className='big-form' src="https://docs.google.com/forms/d/e/1FAIpQLSc1_veiFKbR2i3uqTdNQiR-5MZxLvLj_nbssYcrqqwfMsR0PA/viewform?embedded=true" width="640" height="586" frameborder="0" marginheight="0" marginwidth="0">Loading…</iframe>
        </section>
        </>
    );
}