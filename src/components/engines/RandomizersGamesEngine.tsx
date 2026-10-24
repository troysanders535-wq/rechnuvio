"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { HeadsOrTailsEngine } from "./HeadsOrTailsEngine";
import { WheelView, WHEEL_CONFIGS } from "./randomizers/WheelView";
import { DiceRollerView, DndDiceRollerView, RollTwoDiceView } from "./randomizers/DiceViews";
import {
  BingoCallerView,
  BingoCardGeneratorView,
  BlankBingoCardView,
  CustomBingoCardMakerView,
  PrintableBingoCardsView,
  ThemedBingoView,
} from "./randomizers/BingoViews";
import { BracketWorkspace, type BracketConfig } from "./randomizers/BracketViews";
import { CountdownView, type CountdownConfig } from "./randomizers/CountdownViews";
import {
  ChristmasListTemplateView,
  DirtySantaRulesView,
  LetterToSantaTemplateView,
  WhiteElephantRulesView,
  YankeeSwapRulesView,
} from "./randomizers/SeasonalViews";
import {
  ChristmasBudgetPlannerView,
  ChristmasListMakerView,
  ChristmasWishListMakerView,
} from "./randomizers/SeasonalListViews";
import { BabyNameView, type BabyNameConfig } from "./randomizers/NameViews";
import { UsernameView, type UsernamePlatform } from "./randomizers/UsernameViews";
import { ListRandomizerView, SplitWorkspace } from "./randomizers/ListViews";
import {
  RandomLetterGeneratorView,
  RandomNumberGeneratorView,
  SecretSantaGeneratorView,
  WhiteElephantGeneratorView,
} from "./randomizers/MiscViews";

/**
 * The randomizers and games engine.
 *
 * The family owns 50 tools and every one of them gets its own workspace: the
 * engine looks the tool up in the map below and renders the workspace that
 * belongs to it. There is no shared fallback panel any more, so a tool can
 * no longer show the workspace of another tool.
 */

/* ------------------------------------------------------ the wheel --- */

const WHEEL_VIEWS: Record<string, () => React.ReactNode> = {
  "wheel-of-names": () => <WheelView config={WHEEL_CONFIGS["wheel-of-names"]} />,
  "random-winner-picker": () => <WheelView config={WHEEL_CONFIGS["random-winner-picker"]} />,
  "random-name-picker": () => <WheelView config={WHEEL_CONFIGS["random-name-picker"]} />,
  "random-item-picker": () => <WheelView config={WHEEL_CONFIGS["random-item-picker"]} />,
  "yes-or-no-wheel": () => <WheelView config={WHEEL_CONFIGS["yes-or-no-wheel"]} />,
};

/* ---------------------------------------------------- the brackets --- */

const BRACKET_GENERATOR: BracketConfig = {
  titleKey: "bracket.generator.title",
  subtitleKey: "bracket.generator.subtitle",
  mode: "single",
  showShuffle: true,
  showPrint: false,
  defaultTeams: 8,
};

const BRACKET_MAKER: BracketConfig = {
  titleKey: "bracket.maker.title",
  subtitleKey: "bracket.maker.subtitle",
  mode: "single",
  showShuffle: true,
  showPrint: false,
  defaultTeams: 8,
};

const BRACKET_PRINTABLE: BracketConfig = {
  titleKey: "bracket.printable.title",
  subtitleKey: "bracket.printable.subtitle",
  mode: "single",
  showShuffle: false,
  showPrint: true,
  defaultTeams: 8,
};

const BRACKET_SINGLE: BracketConfig = {
  titleKey: "bracket.single.title",
  subtitleKey: "bracket.single.subtitle",
  mode: "single",
  showShuffle: false,
  showPrint: true,
  defaultTeams: 8,
};

const BRACKET_DOUBLE: BracketConfig = {
  titleKey: "bracket.double.title",
  subtitleKey: "bracket.double.subtitle",
  mode: "double",
  showShuffle: true,
  showPrint: true,
  defaultTeams: 4,
};

/* ------------------------------------------------- the countdowns --- */

const COUNTDOWN_CHRISTMAS: CountdownConfig = {
  titleKey: "countdown.christmas.title",
  subtitleKey: "countdown.christmas.subtitle",
  month: 11,
  day: 25,
  icon: "gift",
};

const COUNTDOWN_HALLOWEEN: CountdownConfig = {
  titleKey: "countdown.halloween.title",
  subtitleKey: "countdown.halloween.subtitle",
  month: 9,
  day: 31,
  icon: "party",
};

/* ------------------------------------------------------ the names --- */

const BABY_BOY: BabyNameConfig = {
  titleKey: "names.boy.title",
  subtitleKey: "names.boy.subtitle",
  genders: ["boy", "unisex"],
  chooseGender: false,
};

const BABY_GIRL: BabyNameConfig = {
  titleKey: "names.girl.title",
  subtitleKey: "names.girl.subtitle",
  genders: ["girl", "unisex"],
  chooseGender: false,
};

const BABY_AI: BabyNameConfig = {
  titleKey: "names.ai.title",
  subtitleKey: "names.ai.subtitle",
  genders: ["boy", "girl", "unisex"],
  chooseGender: true,
};

/* -------------------------------------------------- the usernames --- */

const USERNAME_GENERIC: UsernamePlatform = {
  titleKey: "usernames.generic.title",
  subtitleKey: "usernames.generic.subtitle",
  min: 3,
  max: 30,
  pattern: /^[A-Za-z0-9_]+$/,
  ruleKeys: ["usernames.generic.rules.0", "usernames.generic.rules.1", "usernames.generic.rules.2"],
  separators: ["_", ""],
};

const USERNAME_REDDIT: UsernamePlatform = {
  titleKey: "usernames.reddit.title",
  subtitleKey: "usernames.reddit.subtitle",
  min: 3,
  max: 30,
  pattern: /^[A-Za-z0-9_]+$/,
  ruleKeys: ["usernames.reddit.rules.0", "usernames.reddit.rules.1", "usernames.reddit.rules.2"],
  separators: ["_", ""],
};

const USERNAME_DISCORD: UsernamePlatform = {
  titleKey: "usernames.discord.title",
  subtitleKey: "usernames.discord.subtitle",
  min: 2,
  max: 32,
  pattern: /^[A-Za-z0-9_.]+$/,
  ruleKeys: [
    "usernames.discord.rules.0",
    "usernames.discord.rules.1",
    "usernames.discord.rules.2",
  ],
  separators: ["_", ".", ""],
};

const USERNAME_TWITCH: UsernamePlatform = {
  titleKey: "usernames.twitch.title",
  subtitleKey: "usernames.twitch.subtitle",
  min: 4,
  max: 25,
  pattern: /^[A-Za-z0-9_]+$/,
  ruleKeys: ["usernames.twitch.rules.0", "usernames.twitch.rules.1", "usernames.twitch.rules.2"],
  separators: ["_", ""],
};

/* ------------------------------------------------ the dispatch map --- */

/** The workspace of every tool of the family. */
const VIEW_BY_SLUG: Record<string, () => React.ReactNode> = {
  /* the coin */
  "coin-flip": () => <HeadsOrTailsEngine slug="coin-flip" />,
  "coin-flip-simulator": () => <HeadsOrTailsEngine slug="coin-flip-simulator" />,
  "flip-a-coin": () => <HeadsOrTailsEngine slug="flip-a-coin" />,
  "heads-or-tails": () => <HeadsOrTailsEngine slug="heads-or-tails" />,

  /* the wheel */
  ...WHEEL_VIEWS,

  /* the dice */
  "dice-roller": () => <DiceRollerView />,
  "dnd-dice-roller": () => <DndDiceRollerView />,
  "roll-two-dice": () => <RollTwoDiceView />,

  /* the bingo cards */
  "bingo-card-generator": () => <BingoCardGeneratorView />,
  "blank-bingo-card": () => <BlankBingoCardView />,
  "printable-bingo-cards": () => <PrintableBingoCardsView />,
  "custom-bingo-card-maker": () => <CustomBingoCardMakerView />,
  "bingo-caller": () => <BingoCallerView />,
  "christmas-bingo": () => <ThemedBingoView theme="christmas" />,
  "new-years-bingo": () => <ThemedBingoView theme="newYears" />,
  "thanksgiving-bingo": () => <ThemedBingoView theme="thanksgiving" />,
  "baby-shower-bingo": () => <ThemedBingoView theme="babyShower" />,

  /* the brackets */
  "bracket-generator": () => <BracketWorkspace config={BRACKET_GENERATOR} />,
  "bracket-maker": () => <BracketWorkspace config={BRACKET_MAKER} />,
  "printable-bracket": () => <BracketWorkspace config={BRACKET_PRINTABLE} />,
  "single-elimination-bracket": () => <BracketWorkspace config={BRACKET_SINGLE} />,
  "double-elimination-bracket": () => <BracketWorkspace config={BRACKET_DOUBLE} />,

  /* the countdowns */
  "days-until-christmas": () => <CountdownView config={COUNTDOWN_CHRISTMAS} />,
  "days-until-halloween": () => <CountdownView config={COUNTDOWN_HALLOWEEN} />,

  /* the rules and the templates */
  "dirty-santa-rules": () => <DirtySantaRulesView />,
  "white-elephant-rules": () => <WhiteElephantRulesView />,
  "yankee-swap-rules": () => <YankeeSwapRulesView />,
  "letter-to-santa-template": () => <LetterToSantaTemplateView />,
  "christmas-list-template": () => <ChristmasListTemplateView />,

  /* the Christmas lists and the budget */
  "christmas-list-maker": () => <ChristmasListMakerView />,
  "christmas-wish-list-maker": () => <ChristmasWishListMakerView />,
  "christmas-budget-planner": () => <ChristmasBudgetPlannerView />,

  /* the name generators */
  "baby-boy-name-generator": () => <BabyNameView config={BABY_BOY} />,
  "baby-girl-name-generator": () => <BabyNameView config={BABY_GIRL} />,
  "baby-name-ai": () => <BabyNameView config={BABY_AI} />,

  /* the username generators */
  "username-generator": () => <UsernameView platform={USERNAME_GENERIC} />,
  "reddit-username-generator": () => <UsernameView platform={USERNAME_REDDIT} />,
  "discord-username-generator": () => <UsernameView platform={USERNAME_DISCORD} />,
  "twitch-username-generator": () => <UsernameView platform={USERNAME_TWITCH} />,

  /* the list, group and team generators */
  "list-randomizer": () => <ListRandomizerView />,
  "random-group-generator": () => <SplitWorkspace mode="group" />,
  "random-team-generator": () => <SplitWorkspace mode="team" />,

  /* the remaining randomizers */
  "random-number-generator": () => <RandomNumberGeneratorView />,
  "random-letter-generator": () => <RandomLetterGeneratorView />,
  "secret-santa-generator": () => <SecretSantaGeneratorView />,
  "white-elephant-generator": () => <WhiteElephantGeneratorView />,
};

/** The workspace of a tool that is not part of the family. */
function UnknownToolView({ slug }: { slug: string }) {
  const t = useTranslations("ui.engines.randomizers");
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      <p className="font-semibold">{t("engine.unknownTitle")}</p>
      <p className="mt-1 text-xs">{t("engine.unknownBody", { slug })}</p>
    </div>
  );
}

export function RandomizersGamesEngine({ slug }: { slug: string }) {
  const view = VIEW_BY_SLUG[slug];
  if (!view) return <UnknownToolView slug={slug} />;
  return <>{view()}</>;
}
