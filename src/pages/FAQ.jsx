import { Link } from 'react-router-dom'
import styles from './FAQ.module.css'

const doengTable = (
  <div>
    <p className={styles.answer}>
      Doeng-skalaen er enkel, men smertefull for den som havner bak:
    </p>
    <table className={styles.scaleTable}>
      <thead>
        <tr>
          <th>Plassering</th>
          <th>Doeng</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>1. plass</td><td>−2</td></tr>
        <tr><td>2. plass</td><td>0</td></tr>
        <tr><td>3. plass</td><td>2</td></tr>
        <tr><td>4. plass og ned</td><td>= plasseringen (4, 5, 6 …)</td></tr>
      </tbody>
    </table>
    <p className={styles.answer} style={{ marginTop: '0.75rem' }}>
      Vinneren belønnes altså med negative poeng — jo lenger bak, desto verre. Toppen er gull verdt; bunnen er smertefullt. I eldre utgaver av Byderbyet (2019–2021) var systemet snudd: høyest poengsum vant.
    </p>
  </div>
)

const QAS = [
  {
    q: 'Hva er Byderbyet?',
    a: 'Byderbyet er en uformell idrettskonkurranse mellom venner og bekjente. Over én helg møtes deltakerne til kamp i en rekke øvelser — fra darts og volleyball til quiz og petanque. Det handler like mye om god stemning og dårlig tapersinn som om seier.',
  },
  {
    q: 'Kan jeg se resultater fra tidligere år?',
    a: 'Ja. Bruk fanevalget øverst på forsiden for å bla mellom aktiv turnering og historiske resultater. Klikk på et deltakernavn for å åpne profilen, som viser statistikk, pokaler og adjektiver på tvers av alle år vedkommende har deltatt.',
  },
  {
    q: 'Hvorfor har jeg fått de adjektivene jeg har fått?',
    a: 'Adjektivene beregnes automatisk fra resultatene dine. Øvelsene er gruppert i ti ferdighetskategorier: Presisjon, Strategi, Ballsport, Kasting, Kunnskap, Koordinasjon, Utholdenhet, Kreativitet, Styrke og Duell. For hver kategori du har deltatt i, beregnes gjennomsnittsplasseringen din. Er den ≤ 2,5 er du på elitenivå, er den ≤ 5,5 er du på godt nivå. De tre kategoriene du gjør det best i, vises på profilen.',
  },
  {
    q: 'Hva betyr mastergrad-hatten på adjektivet?',
    a: 'Mastergrad-hatten dukker opp på adjektiver der du har oppnådd elitenivå — altså at du konsekvent ender blant de to-tre beste i den aktuelle kategorien. Det er den høyeste utmerkelsen i et ferdighetsområde. Klikk på adjektivet for å se alle deltakere rangert i samme kategori.',
  },
  {
    q: 'Hva betyr "Doeng"?',
    a: 'Doeng er poengsystemet i Byderbyet. Lavest mulig doeng er målet — akkurat som i golf. Plasseringen fra hver øvelse oversettes til doeng via en fast skala, og totalsummen avgjør den endelige rangeringen. Den med lavest sum vinner.',
  },
  {
    q: 'Hvordan beregnes doeng per øvelse?',
    a: doengTable,
  },
  {
    q: 'Hva er en Duell?',
    a: 'En duell er en en-mot-en-konkurranse mellom to utvalgte deltakere. Vinneren belønnes med −2 doeng, mens taperen straffes med +2 doeng. Dueller kan foregå i alt fra Beyblade til Jenga — det er arrangøren som bestemmer øvelsen, og de foregår typisk spredt utover helgen.',
  },
  {
    q: 'Hva er Hansa-sanksjonen?',
    a: 'Hansa-sanksjonen er Byderbyet sin offisielle reaksjon på ett av de groveste bruddene i konkurransen: å dukke opp med en drikkevare produsert av Hansa Bryggeri. Det er ikke bare et dårlig valg — det er en erklæring om at du ikke respekterer verken deg selv, Byderbyet eller de rundt deg. Straffen er umiddelbar og nådeløs: et vilkårlig antall doeng legges rett til i totalen din, ingen skala, ingen anke, ingen juridisk bistand. Arrangøren er dommer, jury og bøddel. Deltakere som har mottatt sanksjonen, bærer merket "Hansa-dranker" på profilen sin — for alltid. La det være en advarsel: det finnes gode øl i verden. Hansa er ikke blant dem.',
  },
  {
    q: 'Hva er Æresgalleriet?',
    a: 'Æresgalleriet øverst på forsiden viser alle tidligere Byderby-vinnere — én per år. Vinneren er den som hadde lavest total doeng da turneringen ble avsluttet. En gullpokal på profilsiden markerer vinnere, sølv- og bronseemblemer markerer 2.- og 3.-plass i avsluttede turneringer.',
  },
  {
    q: 'Hvem kan delta i Byderbyet?',
    a: 'Byderbyet er en invitasjonsbasert konkurranse for venner og bekjente. Deltakerantallet varierer fra år til år, men ligger vanligvis rundt 10–15 personer. Har du lyst til å delta, må du overbevise noen av de eksisterende deltakerne om at du hører hjemme i fellesskapet.',
  },
  {
    q: 'Når oppdateres resultatene på siden?',
    a: 'Resultater legges inn av administrator underveis i turneringen. Så snart en øvelse er publisert, vises poengene umiddelbart på forsiden og rangeringen oppdateres i sanntid — du kan følge med på mobilen mellom øvelsene.',
  },
  {
    q: 'Hva skjer ved poenglikhet?',
    a: 'Det er ikke noe automatisk tiebreak-system. Ved lik doeng-total avgjøres rekkefølgen etter avtale med arrangøren — gjerne på bakgrunn av antall etappeseiere eller en plutselig-død-ekstraøvelse.',
  },
]

export default function FAQ() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.back}>← Tilbake</Link>
        <h1 className={styles.title}>Ofte stilte spørsmål</h1>
        <p className={styles.subtitle}>Alt du trenger å vite om Byderbyet</p>
      </header>
      <main className={styles.main}>
        <ol className={styles.list}>
          {QAS.map(({ q, a }) => (
            <li key={q} className={styles.item}>
              <p className={styles.question}>{q}</p>
              {typeof a === 'string' ? <p className={styles.answer}>{a}</p> : a}
            </li>
          ))}
        </ol>
      </main>
      <footer className={styles.footer}>
        <Link to="/">← Tilbake til forsiden</Link>
      </footer>
    </div>
  )
}
