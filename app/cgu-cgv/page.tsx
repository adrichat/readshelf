import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage } from "@/components/legal/LegalPage"

export const metadata: Metadata = {
  title: "CGU/CGV — ReadShelf",
}

export default function CguCgvPage() {
  return (
    <LegalPage title="Conditions Générales d'Utilisation et de Vente" updatedAt="26 juillet 2026">
      <section>
        <h2>1. Objet</h2>
        <p>
          Les présentes conditions générales d&apos;utilisation et de vente (« CGU/CGV ») régissent l&apos;accès et
          l&apos;utilisation du site ReadShelf (readshelf.dev), édité par Adrien Guillemot, entrepreneur individuel
          (voir les <Link href="/mentions-legales">mentions légales</Link>), ainsi que l&apos;achat de l&apos;offre Premium
          proposée sur le site. Elles s&apos;appliquent à tout utilisateur du site (« l&apos;Utilisateur »).
        </p>
      </section>

      <section>
        <h2>2. Acceptation</h2>
        <p>
          La création d&apos;un compte ou l&apos;utilisation du site vaut acceptation pleine et entière des présentes
          CGU/CGV. Si l&apos;Utilisateur n&apos;accepte pas ces conditions, il doit s&apos;abstenir d&apos;utiliser le site.
        </p>
      </section>

      <section>
        <h2>3. Description du service</h2>
        <p>
          ReadShelf permet à tout utilisateur de créer une page publique personnalisée présentant sa bibliothèque
          (romans, bandes dessinées, mangas) à une adresse unique de la forme <code>readshelf.dev/nom-utilisateur</code>.
        </p>
        <ul>
          <li>
            <strong>Offre Gratuite :</strong> profil public, bibliothèque illimitée, récupération automatique des
            couvertures, rayons personnalisés, thèmes basiques.
          </li>
          <li>
            <strong>Offre Premium :</strong> paiement unique de 4,99 € TTC donnant accès à vie, pour le compte
            concerné, à des layouts avancés, des polices personnalisées, des effets visuels et des options de
            personnalisation et de référencement supplémentaires.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Création de compte</h2>
        <p>
          L&apos;inscription se fait par email/mot de passe ou via un compte tiers (Google, Discord). L&apos;Utilisateur
          s&apos;engage à fournir des informations exactes et à choisir un nom d&apos;utilisateur qui ne porte pas
          atteinte aux droits de tiers, à l&apos;ordre public ou aux bonnes mœurs. Un compte est personnel et ne peut
          être cédé.
        </p>
      </section>

      <section>
        <h2>5. Obligations de l&apos;utilisateur</h2>
        <p>
          L&apos;Utilisateur s&apos;engage à ne publier sur son profil aucun contenu illicite, injurieux, diffamatoire,
          contrefaisant ou portant atteinte aux droits de tiers. L&apos;éditeur se réserve le droit de suspendre ou
          supprimer, sans préavis, tout compte ne respectant pas ces règles.
        </p>
      </section>

      <section>
        <h2>6. Tarifs et paiement de l&apos;offre Premium</h2>
        <p>
          Le prix de l&apos;offre Premium est indiqué en euros, toutes taxes comprises, sur la page{" "}
          <code>/dashboard/premium</code> avant tout paiement. Il s&apos;agit d&apos;un paiement unique, sans
          abonnement ni reconduction. Le paiement est traité par notre prestataire{" "}
          <a href="https://stripe.com" target="_blank" rel="noopener noreferrer">Stripe</a>, qui collecte directement
          les données bancaires de l&apos;Utilisateur ; l&apos;éditeur n&apos;y a jamais accès. L&apos;accès aux
          fonctionnalités Premium est débloqué immédiatement après confirmation du paiement par Stripe.
        </p>
      </section>

      <section>
        <h2>7. Droit de rétractation</h2>
        <p>
          Conformément à l&apos;article L221-28 du Code de la consommation, le droit de rétractation ne peut être
          exercé pour la fourniture d&apos;un contenu ou service numérique non fourni sur support matériel dont
          l&apos;exécution a commencé avec l&apos;accord préalable et exprès du consommateur, qui a reconnu
          renoncer ainsi à son droit de rétractation. En cochant la case de confirmation avant paiement,
          l&apos;Utilisateur demande expressément l&apos;exécution immédiate du service Premium et renonce à son
          droit de rétractation de 14 jours dès que les fonctionnalités sont débloquées.
        </p>
      </section>

      <section>
        <h2>8. Disponibilité et responsabilité</h2>
        <p>
          L&apos;éditeur s&apos;efforce d&apos;assurer un accès continu au site mais ne garantit pas une disponibilité
          ininterrompue (maintenance, panne, cas de force majeure). L&apos;éditeur ne saurait être tenu responsable
          des dommages indirects résultant de l&apos;utilisation du site. Les couvertures et métadonnées de livres
          affichées proviennent de bases publiques tierces (Open Library, Google Books) dont l&apos;exactitude
          n&apos;est pas garantie par l&apos;éditeur.
        </p>
      </section>

      <section>
        <h2>9. Résiliation et suppression de compte</h2>
        <p>
          L&apos;Utilisateur peut demander la suppression de son compte à tout moment en écrivant à{" "}
          <a href="mailto:adrien.guillemot@outlook.fr">adrien.guillemot@outlook.fr</a>. L&apos;achat Premium
          n&apos;est pas remboursable une fois le service exécuté, sauf disposition légale contraire.
        </p>
      </section>

      <section>
        <h2>10. Modification des CGU/CGV</h2>
        <p>
          L&apos;éditeur peut modifier les présentes CGU/CGV à tout moment ; la version applicable est celle en
          vigueur au moment de l&apos;utilisation du site ou de l&apos;achat.
        </p>
      </section>

      <section>
        <h2>11. Médiation de la consommation</h2>
        <p>
          Conformément à l&apos;article L616-1 du Code de la consommation, en cas de litige, l&apos;Utilisateur
          consommateur peut recourir gratuitement à un médiateur de la consommation. Les coordonnées du médiateur
          compétent seront communiquées sur cette page dès sa désignation.
        </p>
      </section>

      <section>
        <h2>12. Droit applicable</h2>
        <p>
          Les présentes CGU/CGV sont soumises au droit français. À défaut de résolution amiable, tout litige relève
          de la compétence des tribunaux français.
        </p>
      </section>
    </LegalPage>
  )
}
