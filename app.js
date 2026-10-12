"use strict";

const WEAPON_DATA_URL = "./data/weapons/warrior.json";
const STORAGE_KEY = "mabinogi-build-warrior-weapon-id";

const REQUIRED_STRING_FIELDS = [
  "id",
  "name",
  "class",
  "rarity",
  "weaponType",
  "mainStat",
];

const REQUIRED_NUMBER_FIELDS = [
  "requiredLevel",
  "attackMin",
  "attackMax",
  "normalAttack",
  "statScale",
  "bonusDamage",
  "durability",
  "weight",
];

let weapons = [];
let selectedWeapon = null;

const elements = {
  errorAlert: document.getElementById("error-alert"),
  errorMessage: document.getElementById("error-message"),
  retryButton: document.getElementById("retry-button"),
  loading: document.getElementById("loading"),

  weaponSelect: document.getElementById("weapon-select"),
  weaponCount: document.getElementById("weapon-count"),

  summaryAttack: document.getElementById("summary-attack"),
  summaryNormalAttack: document.getElementById(
    "summary-normal-attack",
  ),
  summaryMainStat: document.getElementById("summary-main-stat"),
  summaryBonusDamage: document.getElementById(
    "summary-bonus-damage",
  ),
  summaryEffectCount: document.getElementById(
    "summary-effect-count",
  ),

  slotWeaponName: document.getElementById("slot-weapon-name"),
  slotWeaponDetail: document.getElementById("slot-weapon-detail"),

  selectedWeaponCard: document.getElementById(
    "selected-weapon-card",
  ),
  selectedWeaponName: document.getElementById(
    "selected-weapon-name",
  ),
  selectedWeaponRarity: document.getElementById(
    "selected-weapon-rarity",
  ),
  selectedWeaponLevel: document.getElementById(
    "selected-weapon-level",
  ),
  selectedWeaponType: document.getElementById(
    "selected-weapon-type",
  ),
  selectedWeaponDurability: document.getElementById(
    "selected-weapon-durability",
  ),
  selectedWeaponWeight: document.getElementById(
    "selected-weapon-weight",
  ),
  selectedWeaponAttack: document.getElementById(
    "selected-weapon-attack",
  ),
  selectedWeaponNormal: document.getElementById(
    "selected-weapon-normal",
  ),
  selectedWeaponScale: document.getElementById(
    "selected-weapon-scale",
  ),
  selectedWeaponBonus: document.getElementById(
    "selected-weapon-bonus",
  ),

  effectList: document.getElementById("effect-list"),

  resetButton: document.getElementById("reset-button"),
  saveButton: document.getElementById("save-button"),
};

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validateEffect(effect, weaponName, index) {
  if (
    effect === null ||
    typeof effect !== "object" ||
    Array.isArray(effect)
  ) {
    throw new Error(
      `${weaponName}のeffects[${index}]が不正です。`,
    );
  }

  if (!isNonEmptyString(effect.id)) {
    throw new Error(
      `${weaponName}のeffects[${index}].idが不正です。`,
    );
  }

  if (!isFiniteNumber(effect.value)) {
    throw new Error(
      `${weaponName}のeffects[${index}].valueが数値ではありません。`,
    );
  }

  return effect;
}

function validateWeapon(weapon, index) {
  if (
    weapon === null ||
    typeof weapon !== "object" ||
    Array.isArray(weapon)
  ) {
    throw new Error(
      `${index + 1}件目の武器データが不正です。`,
    );
  }

  for (const field of REQUIRED_STRING_FIELDS) {
    if (!isNonEmptyString(weapon[field])) {
      throw new Error(
        `${index + 1}件目の「${field}」が不正です。`,
      );
    }
  }

  for (const field of REQUIRED_NUMBER_FIELDS) {
    if (!isFiniteNumber(weapon[field])) {
      throw new Error(
        `${weapon.name}の「${field}」が数値ではありません。`,
      );
    }
  }

  if (weapon.attackMin > weapon.attackMax) {
    throw new Error(
      `${weapon.name}の最小攻撃力が最大攻撃力を上回っています。`,
    );
  }

  if (!Array.isArray(weapon.effects)) {
    throw new Error(
      `${weapon.name}のeffectsが配列ではありません。`,
    );
  }

  weapon.effects.forEach((effect, effectIndex) => {
    validateEffect(effect, weapon.name, effectIndex);
  });

  return weapon;
}

function validateWeapons(data) {
  if (!Array.isArray(data)) {
    throw new Error(
      "warrior.jsonのルートは配列にしてください。",
    );
  }

  const validatedWeapons = data.map(validateWeapon);
  const ids = new Set();

  for (const weapon of validatedWeapons) {
    if (ids.has(weapon.id)) {
      throw new Error(
        `重複した武器IDがあります: ${weapon.id}`,
      );
    }

    ids.add(weapon.id);
  }

  return validatedWeapons;
}

function formatNumber(value) {
  if (!isFiniteNumber(value)) {
    return "0";
  }

  return new Intl.NumberFormat("ja-JP", {
    maximumFractionDigits: 2,
  }).format(value);
}

function getRarityLabel(rarity) {
  const labels = {
    common: "コモン",
    normal: "ノーマル",
    rare: "レア",
    epic: "エピック",
    unique: "ユニーク",
    legendary: "レジェンダリー",
  };

  return labels[rarity] ?? rarity;
}

function getWeaponTypeLabel(weaponType) {
  const labels = {
    sword_shield: "剣と盾",
    greatsword: "大剣",
    bow: "弓",
    crossbow: "クロスボウ",
    longbow: "ロングボウ",
    staff: "スタッフ",
    wand: "ワンド",
  };

  return labels[weaponType] ?? weaponType;
}

function getEffectLabel(effectId) {
  const labels = {
    attack_power: "攻撃力",
    unique_attack_power: "攻撃力",
    additional_attack_rate: "追加攻撃率",
    dot_damage: "持続ダメージ",
    critical_rate: "クリティカル率",
    critical_damage: "クリティカルダメージ",
    skill_power: "スキル威力",
    fast_skill: "スキル速度",
  };

  return labels[effectId] ?? effectId;
}

function getEffectUnit(effectId) {
  const percentageEffectIds = new Set([
    "additional_attack_rate",
    "critical_rate",
    "critical_damage",
    "skill_power",
    "fast_skill",
  ]);

  return percentageEffectIds.has(effectId) ? "%" : "";
}

function setLoading(isLoading) {
  elements.loading.hidden = !isLoading;
  elements.weaponSelect.disabled =
    isLoading || weapons.length === 0;
}

function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorAlert.hidden = false;
}

function hideError() {
  elements.errorMessage.textContent = "";
  elements.errorAlert.hidden = true;
}

function renderWeaponOptions() {
  elements.weaponSelect.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "武器を選択してください";
  elements.weaponSelect.appendChild(placeholder);

  const sortedWeapons = [...weapons].sort((left, right) => {
    if (left.requiredLevel !== right.requiredLevel) {
      return left.requiredLevel - right.requiredLevel;
    }

    return left.name.localeCompare(right.name, "ja");
  });

  for (const weapon of sortedWeapons) {
    const option = document.createElement("option");
    option.value = weapon.id;
    option.textContent =
      `Lv${weapon.requiredLevel} ${weapon.name}`;

    elements.weaponSelect.appendChild(option);
  }

  elements.weaponCount.textContent = `${weapons.length}件`;
  elements.weaponSelect.disabled = weapons.length === 0;
}

function renderEmptyEffects() {
  const wrapper = document.createElement("div");
  wrapper.className = "empty-information";

  const icon = document.createElement("span");
  icon.className = "empty-information__icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "✧";

  const message = document.createElement("p");
  message.textContent =
    "特殊効果のある武器を選択すると表示されます。";

  wrapper.append(icon, message);
  elements.effectList.replaceChildren(wrapper);
}

function renderEffects(effects) {
  if (!Array.isArray(effects) || effects.length === 0) {
    renderEmptyEffects();
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const effect of effects) {
    const item = document.createElement("article");
    item.className = "effect-item";

    const icon = document.createElement("span");
    icon.className = "effect-item__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "✦";

    const content = document.createElement("div");

    const name = document.createElement("div");
    name.className = "effect-item__name";
    name.textContent = getEffectLabel(effect.id);

    const value = document.createElement("div");
    value.className = "effect-item__value";
    value.textContent =
      `+${formatNumber(effect.value)}${getEffectUnit(effect.id)}`;

    content.append(name, value);
    item.append(icon, content);
    fragment.appendChild(item);
  }

  elements.effectList.replaceChildren(fragment);
}

function renderEmptyBuild() {
  elements.summaryAttack.textContent = "0 ～ 0";
  elements.summaryNormalAttack.textContent = "0";
  elements.summaryMainStat.textContent = "未設定";
  elements.summaryBonusDamage.textContent = "0";
  elements.summaryEffectCount.textContent = "0";

  elements.slotWeaponName.textContent = "未装備";
  elements.slotWeaponDetail.textContent =
    "武器を選択してください";

  elements.selectedWeaponCard.hidden = true;

  renderEmptyEffects();
}

function renderSelectedWeapon(weapon) {
  if (!weapon) {
    renderEmptyBuild();
    return;
  }

  elements.summaryAttack.textContent =
    `${formatNumber(weapon.attackMin)} ～ ` +
    `${formatNumber(weapon.attackMax)}`;

  elements.summaryNormalAttack.textContent =
    formatNumber(weapon.normalAttack);

  elements.summaryMainStat.textContent =
    `${weapon.mainStat} ×${formatNumber(weapon.statScale)}`;

  elements.summaryBonusDamage.textContent =
    formatNumber(weapon.bonusDamage);

  elements.summaryEffectCount.textContent =
    String(weapon.effects.length);

  elements.slotWeaponName.textContent = weapon.name;
  elements.slotWeaponDetail.textContent =
    `Lv${weapon.requiredLevel}・` +
    `${formatNumber(weapon.attackMin)} ～ ` +
    `${formatNumber(weapon.attackMax)}`;

  elements.selectedWeaponName.textContent = weapon.name;

  elements.selectedWeaponRarity.className =
    `rarity-badge rarity-${weapon.rarity.toLowerCase()}`;

  elements.selectedWeaponRarity.textContent =
    getRarityLabel(weapon.rarity);

  elements.selectedWeaponLevel.textContent =
    `装備Lv ${weapon.requiredLevel}`;

  elements.selectedWeaponType.textContent =
    getWeaponTypeLabel(weapon.weaponType);

  elements.selectedWeaponDurability.textContent =
    `耐久 ${formatNumber(weapon.durability)}`;

  elements.selectedWeaponWeight.textContent =
    `重量 ${formatNumber(weapon.weight)}`;

  elements.selectedWeaponAttack.textContent =
    `${formatNumber(weapon.attackMin)} ～ ` +
    `${formatNumber(weapon.attackMax)}`;

  elements.selectedWeaponNormal.textContent =
    formatNumber(weapon.normalAttack);

  elements.selectedWeaponScale.textContent =
    `${weapon.mainStat} ×${formatNumber(weapon.statScale)}`;

  elements.selectedWeaponBonus.textContent =
    formatNumber(weapon.bonusDamage);

  elements.selectedWeaponCard.hidden = false;

  renderEffects(weapon.effects);
}

function selectWeaponById(weaponId, persist = true) {
  selectedWeapon =
    weapons.find((weapon) => weapon.id === weaponId) ?? null;

  elements.weaponSelect.value = selectedWeapon?.id ?? "";

  renderSelectedWeapon(selectedWeapon);

  if (!persist) {
    return;
  }

  if (selectedWeapon) {
    window.localStorage.setItem(
      STORAGE_KEY,
      selectedWeapon.id,
    );
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function restoreSavedWeapon() {
  const savedWeaponId =
    window.localStorage.getItem(STORAGE_KEY);

  if (!savedWeaponId) {
    renderEmptyBuild();
    return;
  }

  const exists = weapons.some(
    (weapon) => weapon.id === savedWeaponId,
  );

  if (!exists) {
    window.localStorage.removeItem(STORAGE_KEY);
    renderEmptyBuild();
    return;
  }

  selectWeaponById(savedWeaponId, false);
}

async function loadWeapons() {
  hideError();
  setLoading(true);

  try {
    const response = await fetch(WEAPON_DATA_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-cache",
    });

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ` +
        "warrior.jsonを取得できませんでした。",
      );
    }

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        "warrior.jsonをJSONとして解析できませんでした。" +
        "カンマや括弧を確認してください。",
      );
    }

    weapons = validateWeapons(data);

    renderWeaponOptions();
    restoreSavedWeapon();
  } catch (error) {
    console.error("武器データ読込エラー:", error);

    weapons = [];
    selectedWeapon = null;

    renderWeaponOptions();
    renderEmptyBuild();

    const message =
      error instanceof Error
        ? error.message
        : "不明なエラーが発生しました。";

    showError(message);
  } finally {
    setLoading(false);
  }
}

elements.weaponSelect.addEventListener("change", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLSelectElement)) {
    return;
  }

  hideError();
  selectWeaponById(target.value);
});

elements.resetButton.addEventListener("click", () => {
  hideError();
  selectWeaponById("");
});

elements.saveButton.addEventListener("click", () => {
  if (!selectedWeapon) {
    showError("保存する武器が選択されていません。");
    return;
  }

  hideError();

  window.localStorage.setItem(
    STORAGE_KEY,
    selectedWeapon.id,
  );

  const originalText = elements.saveButton.textContent;
  elements.saveButton.textContent = "保存しました";

  window.setTimeout(() => {
    elements.saveButton.textContent = originalText;
  }, 1300);
});

elements.retryButton.addEventListener("click", () => {
  loadWeapons();
});

loadWeapons();
