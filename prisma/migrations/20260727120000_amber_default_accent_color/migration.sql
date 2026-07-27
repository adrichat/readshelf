-- Remplace la couleur d'accent par défaut (violet) par l'ambre, cohérent
-- avec la nouvelle identité visuelle. N'affecte que les nouveaux profils ;
-- les profils existants gardent leur accentColor déjà enregistrée.
ALTER TABLE "Profile" ALTER COLUMN "accentColor" SET DEFAULT '#d97706';
