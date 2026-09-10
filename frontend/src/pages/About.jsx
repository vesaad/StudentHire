import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="container about-page">
      <p className="eyebrow">RRETH STUDENTHIRE</p>
      <h1>
        Një urë mes studimeve
        <br />
        dhe <em>hapit të parë.</em>
      </h1>
      <p className="about-intro">
        Besojmë se potenciali meriton një mundësi. StudentHire po ndërtohet për t’i afruar studentët
        me botën profesionale dhe kompanitë me talentet e reja.
      </p>
      <div className="path-grid">
        <article className="path-card">
          <span className="step-number">01 / STUDENTËT</span>
          <h2 className="h4">Hapësirë për t’u rritur</h2>
          <p>
            Një vend për të prezantuar aftësitë, për të zbuluar mundësi dhe për të ndjekur
            aplikimet.
          </p>
        </article>
        <article className="path-card">
          <span className="step-number">02 / KOMPANITË</span>
          <h2 className="h4">Njihuni me potencialin</h2>
          <p>
            Një mënyrë për të prezantuar kompaninë, për të publikuar oferta dhe për të njohur
            kandidatët.
          </p>
        </article>
        <article className="path-card">
          <span className="step-number">03 / PLATFORMA</span>
          <h2 className="h4">Kujdes për përvojën</h2>
          <p>
            Administrimi i kompanive, ofertave dhe aftësive ndihmon në organizimin e platformës.
          </p>
        </article>
      </div>
      <div className="about-bottom">
        <h2>Njihu me hapësirën tënde.</h2>
        <Link className="btn btn-primary" to="/opportunities">
          Shiko ofertat ↗
        </Link>
      </div>
    </div>
  );
}
