import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage } from "@/components/legal/LegalPage"

export const metadata: Metadata = {
  title: "Mentions légales — ReadShelf",
}

export default function MentionsLegalesPage() {
  return (
    <LegalPage title="Mentions légales" updatedAt="26 juillet 2026">
      <section>
        <h2>Éditeur du site</h2>
        <p>
          Le site ReadShelf (readshelf.dev) est édité par :
        </p>
        <ul>
          <li><strong>Nom :</strong> Adrien Guillemot</li>
          <li><strong>Statut :</strong> Entrepreneur individuel (EI)</li>
          <li><strong>SIRET :</strong> 981 782 824 00016</li>
          <li><strong>RCS :</strong> Strasbourg</li>
          <li><strong>Adresse :</strong> 43 rue de Sélestat, 67100 Strasbourg, France</li>
          <li><strong>Email :</strong> <a href="mailto:adrien.guillemot@outlook.fr">adrien.guillemot@outlook.fr</a></li>
          <li><strong>Téléphone :</strong> 06 99 23 87 83</li>
          <li><strong>TVA :</strong> TVA non applicable, article 293 B du Code général des impôts</li>
        </ul>
      </section>

      <section>
        <h2>Directeur de la publication</h2>
        <p>Adrien Guillemot, en sa qualité d&apos;éditeur du site.</p>
      </section>

      <section>
        <h2>Hébergement</h2>
        <p>
          Le site est hébergé par :<br />
          Vercel Inc.<br />
          440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis<br />
          <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a>
        </p>
        <p>
          Les données (base de données) sont hébergées par Supabase Inc. — voir la{" "}
          <Link href="/confidentialite">politique de confidentialité</Link> pour le détail des sous-traitants.
        </p>
      </section>

      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          L&apos;ensemble des éléments du site ReadShelf (structure, textes, logos, interfaces, code source) est
          la propriété de l&apos;éditeur, sauf mention contraire. Les couvertures de livres affichées proviennent
          de bases de données publiques (Open Library, Google Books) et restent la propriété de leurs ayants droit
          respectifs. Toute reproduction ou représentation, totale ou partielle, du site ou de son contenu, sans
          autorisation, est interdite.
        </p>
      </section>

      <section>
        <h2>Contenu publié par les utilisateurs</h2>
        <p>
          Les profils, bibliothèques et informations publiées par les utilisateurs restent sous leur responsabilité.
          L&apos;éditeur se réserve le droit de retirer tout contenu manifestement illicite qui lui serait signalé,
          conformément à la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l&apos;économie numérique (LCEN).
        </p>
      </section>

      <section>
        <h2>Signalement d&apos;un contenu</h2>
        <p>
          Pour signaler un contenu illicite ou tout problème, contactez{" "}
          <a href="mailto:adrien.guillemot@outlook.fr">adrien.guillemot@outlook.fr</a>.
        </p>
      </section>

      <section>
        <h2>Droit applicable</h2>
        <p>Le présent site et les présentes mentions légales sont soumis au droit français.</p>
      </section>
    </LegalPage>
  )
}
