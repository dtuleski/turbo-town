import '../game/mini_golf/data.dart';
import 'gen/app_localizations.dart';

/// Lookups for the physics games whose strings depend on data (recipe id,
/// golf score name). gen-l10n creates one getter per key, so each is a
/// switch; an unknown id gives null and callers fall back to the data value.

String? bondRecipeName(AppLocalizations l, String id) {
  switch (id) {
    case 'water':
      return l.bondAndBurn_recipes_water_name;
    case 'salt':
      return l.bondAndBurn_recipes_salt_name;
    case 'co2':
      return l.bondAndBurn_recipes_co2_name;
    case 'methane':
      return l.bondAndBurn_recipes_methane_name;
    case 'ammonia':
      return l.bondAndBurn_recipes_ammonia_name;
    case 'ethane':
      return l.bondAndBurn_recipes_ethane_name;
    case 'hydrogen-peroxide':
      return l.bondAndBurn_recipes_hydrogen_peroxide_name;
    case 'hydrochloric-acid':
      return l.bondAndBurn_recipes_hydrochloric_acid_name;
    case 'sodium-hydroxide':
      return l.bondAndBurn_recipes_sodium_hydroxide_name;
    case 'nitrous-oxide':
      return l.bondAndBurn_recipes_nitrous_oxide_name;
    default:
      return null;
  }
}

String? bondRecipeHint(AppLocalizations l, String id) {
  switch (id) {
    case 'water':
      return l.bondAndBurn_recipes_water_hint;
    case 'salt':
      return l.bondAndBurn_recipes_salt_hint;
    case 'co2':
      return l.bondAndBurn_recipes_co2_hint;
    case 'methane':
      return l.bondAndBurn_recipes_methane_hint;
    case 'ammonia':
      return l.bondAndBurn_recipes_ammonia_hint;
    case 'ethane':
      return l.bondAndBurn_recipes_ethane_hint;
    case 'hydrogen-peroxide':
      return l.bondAndBurn_recipes_hydrogen_peroxide_hint;
    case 'hydrochloric-acid':
      return l.bondAndBurn_recipes_hydrochloric_acid_hint;
    case 'sodium-hydroxide':
      return l.bondAndBurn_recipes_sodium_hydroxide_hint;
    case 'nitrous-oxide':
      return l.bondAndBurn_recipes_nitrous_oxide_hint;
    default:
      return null;
  }
}

String? bondRecipeFunFact(AppLocalizations l, String id) {
  switch (id) {
    case 'water':
      return l.bondAndBurn_recipes_water_funFact;
    case 'salt':
      return l.bondAndBurn_recipes_salt_funFact;
    case 'co2':
      return l.bondAndBurn_recipes_co2_funFact;
    case 'methane':
      return l.bondAndBurn_recipes_methane_funFact;
    case 'ammonia':
      return l.bondAndBurn_recipes_ammonia_funFact;
    case 'ethane':
      return l.bondAndBurn_recipes_ethane_funFact;
    case 'hydrogen-peroxide':
      return l.bondAndBurn_recipes_hydrogen_peroxide_funFact;
    case 'hydrochloric-acid':
      return l.bondAndBurn_recipes_hydrochloric_acid_funFact;
    case 'sodium-hydroxide':
      return l.bondAndBurn_recipes_sodium_hydroxide_funFact;
    case 'nitrous-oxide':
      return l.bondAndBurn_recipes_nitrous_oxide_funFact;
    default:
      return null;
  }
}

/// Name of a hole result against par ("Birdie!").
String golfScoreText(AppLocalizations l, GolfScoreName name) => switch (name) {
      GolfScoreName.albatross => l.mobilePhysics_golfAlbatross,
      GolfScoreName.eagle => l.mobilePhysics_golfEagle,
      GolfScoreName.birdie => l.mobilePhysics_golfBirdie,
      GolfScoreName.par => l.mobilePhysics_golfParName,
      GolfScoreName.bogey => l.mobilePhysics_golfBogey,
      GolfScoreName.doubleBogey => l.mobilePhysics_golfDoubleBogey,
      GolfScoreName.tripleBogeyPlus => l.mobilePhysics_golfTripleBogey,
    };
