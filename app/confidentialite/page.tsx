import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage } from "@/components/legal/LegalPage"

export const metadata: Metadata = {
  title: "Politique de confidentialité — ReadShelf",
}

export default function ConfidentialitePage() {
  return (
    <LegalPage title="Politique de confidentialité" updatedAt="26 juillet 2026">
      <section>
        <p>
          Cette politique décrit comment ReadShelf, édité par Adrien Guillemot, entrepreneur individuel (voir les{" "}
          <Link href="/mentions-legales">mentions légales</Link>), collecte et traite les données personnelles des
          utilisateurs, conformément au Règlement (UE) 2016/679 (« RGPD ») et à la loi Informatique et Libertés.
        </p>
      </section>

      <section>
        <h2>1. Responsable du traitement</h2>
        <p>
          Adrien Guillemot, 43 rue de Sélestat, 67100 Strasbourg —{" "}
          <a href="mailto:adrien.guillemot@outlook.fr">adrien.guillemot@outlook.fr</a>. Compte tenu de la taille de
          l&apos;activité, aucun délégué à la protection des données (DPO) n&apos;a été désigné ; le responsable du
          traitement est le point de contact pour toute question relative aux données personnelles.
        </p>
      </section>

      <section>
        <h2>2. Données collectées</h2>
        <ul>
          <li><strong>Compte :</strong> email, mot de passe (stocké après hachage, jamais en clair), nom d&apos;utilisateur, nom affiché, photo de profil, biographie.</li>
          <li><strong>Connexion via tiers :</strong> si l&apos;Utilisateur se connecte via Google ou Discord, les informations transmises par ces services (identifiant, email, nom, avatar).</li>
          <li><strong>Bibliothèque :</strong> livres ajoutés, statut de lecture, notes, favoris, rayons personnalisés.</li>
          <li><strong>Personnalisation du profil :</strong> préférences d&apos;apparence (couleurs, polices, fonds, effets), liens sociaux renseignés, titre/description SEO.</li>
          <li><strong>Usage :</strong> statistiques de vues de profil, séries de connexion (« streak »), succès débloqués.</li>
          <li><strong>Paiement (offre Premium) :</strong> l&apos;éditeur ne stocke aucune donnée bancaire. Ces données sont collectées et traitées directement par Stripe. L&apos;éditeur conserve uniquement l&apos;identifiant client Stripe et le statut Premium du compte.</li>
        </ul>
      </section>

      <section>
        <h2>3. Finalités et bases légales</h2>
        <ul>
          <li><strong>Fourniture du service</strong> (création et gestion du compte, affichage de la page publique) — exécution du contrat.</li>
          <li><strong>Traitement des paiements Premium</strong> — exécution du contrat.</li>
          <li><strong>Communications liées au compte</strong> (vérification d&apos;email, notifications de sécurité) — exécution du contrat / intérêt légitime.</li>
          <li><strong>Sécurité et prévention des abus</strong> — intérêt légitime.</li>
          <li><strong>Respect des obligations légales</strong> (comptabilité, réponse aux autorités compétentes) — obligation légale.</li>
        </ul>
      </section>

      <section>
        <h2>4. Destinataires et sous-traitants</h2>
        <p>Les données sont hébergées et traitées par les prestataires suivants, agissant en tant que sous-traitants :</p>
        <ul>
          <li><strong>Vercel Inc.</strong> — hébergement de l&apos;application.</li>
          <li><strong>Supabase Inc.</strong> — hébergement de la base de données (comptes, profils, bibliothèques).</li>
          <li><strong>Stripe Payments Europe, Ltd.</strong> — traitement des paiements de l&apos;offre Premium.</li>
          <li><strong>Resend</strong> — envoi des emails transactionnels (vérification de compte, notifications).</li>
          <li><strong>Google LLC / Discord Inc.</strong> — uniquement si l&apos;Utilisateur choisit de se connecter via ces services (authentification tierce).</li>
        </ul>
        <p>
          Certains de ces prestataires sont situés hors de l&apos;Union européenne (notamment aux États-Unis). Ces
          transferts sont encadrés par des garanties appropriées (clauses contractuelles types de la Commission
          européenne ou certification équivalente), conformément aux articles 44 et suivants du RGPD.
        </p>
        <p>Les données ne sont ni vendues, ni louées, ni utilisées à des fins publicitaires par des tiers.</p>
      </section>

      <section>
        <h2>5. Durée de conservation</h2>
        <p>
          Les données du compte sont conservées tant que le compte est actif. En cas de suppression du compte, les
          données sont effacées dans un délai raisonnable, sous réserve des durées de conservation imposées par la
          loi (notamment les données de facturation liées aux paiements Premium, conservées conformément aux
          obligations comptables et fiscales).
        </p>
      </section>

      <section>
        <h2>6. Cookies</h2>
        <p>
          ReadShelf utilise uniquement un cookie de session strictement nécessaire au fonctionnement du site (gestion
          de la connexion, via NextAuth). Ce cookie technique ne nécessite pas de consentement préalable au titre de
          l&apos;article 82 de la loi Informatique et Libertés. Le site n&apos;utilise aucun cookie publicitaire ni
          traceur d&apos;analyse tiers.
        </p>
      </section>

      <section>
        <h2>7. Vos droits</h2>
        <p>Conformément au RGPD, vous disposez des droits suivants sur vos données personnelles :</p>
        <ul>
          <li>Droit d&apos;accès et de rectification</li>
          <li>Droit à l&apos;effacement</li>
          <li>Droit à la limitation du traitement</li>
          <li>Droit à la portabilité des données</li>
          <li>Droit d&apos;opposition</li>
          <li>Droit de définir des directives relatives au sort de vos données après votre décès</li>
        </ul>
        <p>
          Pour exercer ces droits, contactez{" "}
          <a href="mailto:adrien.guillemot@outlook.fr">adrien.guillemot@outlook.fr</a>. Une réponse sera apportée
          dans un délai maximum d&apos;un mois. Vous pouvez également introduire une réclamation auprès de la CNIL
          (<a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">cnil.fr</a>) si vous estimez que
          vos droits ne sont pas respectés.
        </p>
      </section>

      <section>
        <h2>8. Sécurité</h2>
        <p>
          Les mots de passe sont hachés et jamais stockés en clair. Les échanges avec le site sont chiffrés (HTTPS).
          Des mesures techniques et organisationnelles raisonnables sont mises en œuvre pour protéger les données
          contre l&apos;accès non autorisé, la perte ou l&apos;altération.
        </p>
      </section>

      <section>
        <h2>9. Modifications</h2>
        <p>
          La présente politique peut être mise à jour. La date de dernière mise à jour est indiquée en haut de cette
          page.
        </p>
      </section>
    </LegalPage>
  )
}
