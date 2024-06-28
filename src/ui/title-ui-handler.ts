import BattleScene from "../battle-scene";
import OptionSelectUiHandler from "./settings/option-select-ui-handler";
import { Mode } from "./ui";
import * as Utils from "../utils";
import { TextStyle, addTextObject } from "./text";
import { getSplashMessages } from "../data/splash-messages";
import i18next from "i18next";
import { TimedEventDisplay } from "#app/timed-event-manager.js";
import { Color } from "#app/enums/color.js";
import { PlayerGender } from "#app/enums/player-gender.js";
import { SpeechBubble } from "#app/ui/components/speech-bubble.js";

export default class TitleUiHandler extends OptionSelectUiHandler {
  private titleContainer: Phaser.GameObjects.Container;
  private logo: Phaser.GameObjects.Image;
  private playerCountLabel: Phaser.GameObjects.Text;
  private playerCountWidth: number;
  private splashMessage: string;
  private splashMessageText: Phaser.GameObjects.Text;
  private eventDisplay: TimedEventDisplay;
  private iconContainer: TitleIcons;
  private menuOverlay: Phaser.GameObjects.Rectangle;
  private rivalSprite: Phaser.GameObjects.Sprite;
  private spriteShadow: Phaser.GameObjects.Ellipse;
  private bubble: SpeechBubble;
  private rivalText: Phaser.GameObjects.Text;

  private titleStatsTimer: NodeJS.Timeout;

  constructor(scene: BattleScene, mode: Mode = Mode.TITLE) {
    super(scene, mode);
  }

  setup() {
    super.setup();

    const ui = this.getUi();

    const overlayColor = this.scene.uiTheme ? Color.OFF_WHITE : Color.DARK_GREY;

    this.titleContainer = this.scene.add.container(0, -(this.scene.game.canvas.height / 6));
    this.titleContainer.setName("title");
    this.titleContainer.setAlpha(0);
    ui.add(this.titleContainer);

    this.logo = this.scene.add.image(
      (this.scene.scaledCanvas.width / 4) + 3,
      8,
      "logo"
    );
    this.logo.setName("logo");
    this.logo.setOrigin(0.5, 0);
    this.titleContainer.add(this.logo);

    this.menuOverlay = this.scene.add.rectangle(
      8, 59,
      92, 71,
      Number(`0x${overlayColor.slice(1)}`),
      0.5
    );
    this.menuOverlay.setName("title-options-bg");
    this.menuOverlay.setOrigin(0);
    this.menuOverlay.setBlendMode(Phaser.BlendModes.OVERLAY);
    this.titleContainer.add(this.menuOverlay);

    this.iconContainer = new TitleIcons(
      this.scene,
      15, this.scene.scaledCanvas.height - 15
    );
    this.iconContainer.setup();
    this.titleContainer.add(this.iconContainer);


    this.rivalSprite = new Phaser.GameObjects.Sprite(
      this.scene,
      176, 127,
      `${this.scene.gameData.gender === PlayerGender.MALE ? "ivy" : "finn" }-sprite`
    );
    this.rivalSprite.setName("rival");

    this.spriteShadow = new Phaser.GameObjects.Ellipse(
      this.scene,
      this.rivalSprite.x, (this.rivalSprite.y + this.rivalSprite.height / 2) - 1,
      this.rivalSprite.width / 2, this.rivalSprite.height / 10,
      Number(`0x${Color.DARK_GREY}`), 0.5
    );
    this.spriteShadow.setName("sprite-shadow");
    this.spriteShadow.setBlendMode(Phaser.BlendModes.OVERLAY);
    this.titleContainer.add([this.rivalSprite, this.spriteShadow]);

    if (this.scene.eventManager.isEventActive()) {
      this.eventDisplay = new TimedEventDisplay(this.scene, 189, 49, this.scene.eventManager.activeEvent());
      this.eventDisplay.setup();
      this.titleContainer.add(this.eventDisplay);
    } else {
      this.rivalText = addTextObject(
        this.scene,
        190,
        98,
        "Check the Discord for the latest changes!",
        TextStyle.WINDOW_ALT,
        { fontSize: 49 }
      );
      this.rivalText.setOrigin(0);
      this.rivalText.setName("text-rival-changelog");
    }

    this.bubble = new SpeechBubble(this.scene, 244, 102, (this.eventDisplay?.getByName("text-event-timer") ?? this.rivalText) as Phaser.GameObjects.Text);
    this.titleContainer.add(this.bubble);

    this.playerCountLabel = addTextObject(
      this.scene,
      this.scene.scaledCanvas.width - 60,
      this.scene.scaledCanvas.height - 20,
      i18next.t("menu:playersOnline", { count: 0 }),
      TextStyle.MESSAGE,
      {
        fontSize: "60px",
        align: "right",
      }
    );

    this.playerCountLabel.setName("player-count");
    this.playerCountLabel.setOrigin(0);
    this.playerCountWidth = this.playerCountLabel.width;
    this.titleContainer.add(this.playerCountLabel);

    this.splashMessageText = addTextObject(this.scene, this.logo.x + 64, this.logo.y + this.logo.displayHeight - 8, "", TextStyle.MONEY, { fontSize: "54px" });
    this.splashMessageText.setName("splash-message");
    this.splashMessageText.setOrigin(0.5);
    this.splashMessageText.setAngle(-20);
    this.titleContainer.add(this.splashMessageText);

    const originalSplashMessageScale = this.splashMessageText.scale;

    this.scene.tweens.add({
      targets: this.splashMessageText,
      duration: Utils.fixedInt(350),
      scale: originalSplashMessageScale * 1.25,
      loop: -1,
      yoyo: true,
    });
  }

  updateTitleStats(): void {
    Utils.apiFetch("game/titlestats")
      .then(request => request.json())
      .then((stats: { playerCount: number, battleCount: number }) => {
        this.playerCountLabel.setText(i18next.t("menu:playersOnline", { count: stats.playerCount }));
        this.playerCountLabel.setX(this.playerCountLabel.x - ((this.playerCountLabel.width - this.playerCountWidth) / 6));
        this.playerCountWidth = this.playerCountLabel.width;
      })
      .catch(err => {
        console.error("Failed to fetch title stats:\n", err);
      });
  }

  show(args: any[]): boolean {
    const ret = super.show(args);

    if (ret) {
      this.splashMessage = Utils.randItem(getSplashMessages());
      this.splashMessageText.setText(this.splashMessage);

      const ui = this.getUi();

      if (this.scene.eventManager.isEventActive()) {
        this.eventDisplay.show();
      }

      this.bubble.setVisible(true);
      this.iconContainer.setVisible(true);
      this.update();

      this.updateTitleStats();

      this.titleStatsTimer = setInterval(() => {
        this.updateTitleStats();
      }, 60000);

      this.scene.tweens.add({
        targets: [ this.titleContainer, ui.getMessageHandler().bg ],
        duration: Utils.fixedInt(325),
        alpha: (target: any) => target === this.titleContainer ? 1 : 0,
        ease: "Sine.easeInOut"
      });
    }

    return ret;
  }

  update() {
    const playerMale = this.scene.gameData.gender === PlayerGender.MALE;
    this.rivalSprite.setTexture(`${playerMale ? "ivy" : "finn" }-sprite`);
    this.spriteShadow.setY((this.rivalSprite.y + this.rivalSprite.height / 2) - (playerMale ? 2 : 3));
  }

  clear(): void {
    super.clear();

    const ui = this.getUi();

    this.eventDisplay?.setVisible(false);
    this.iconContainer?.setVisible(false);
    this.bubble.setVisible(false);

    clearInterval(this.titleStatsTimer);
    this.titleStatsTimer = null;

    this.scene.tweens.add({
      targets: [ this.titleContainer, ui.getMessageHandler().bg ],
      duration: Utils.fixedInt(325),
      alpha: (target: any) => target === this.titleContainer ? 0 : 1,
      ease: "Sine.easeInOut"
    });
  }
}

class TitleIcons extends Phaser.GameObjects.Container {
  private icons: Array<Icon> = [];
  private wiki: Icon;
  private discord: Icon;
  private github: Icon;
  private reddit: Icon;
  private readonly ICON_WIDTH = 84;
  private readonly ICON_HEIGHT = 84;

  constructor(scene: BattleScene, x: number, y: number) {
    super(scene, x, y);
  }

  setup() {
    // urls
    let wikiUrl = "https://wiki.pokerogue.net/start";
    const discordUrl = "https://discord.gg/uWpTfdKG49";
    const githubUrl = "https://github.com/pagefaultgames/pokerogue";
    const redditUrl = "https://www.reddit.com/r/pokerogue";


    // wiki url directs based on languges available on wiki
    const lang = i18next.resolvedLanguage.substring(0,2);
    if (["de", "fr", "ko", "zh"].includes(lang)) {
      wikiUrl = `https://wiki.pokerogue.net/${lang}:start`;
    }
    this.wiki = new Icon(this.scene, 0, 0, "wiki", wikiUrl);
    this.icons.push(this.wiki);

    this.discord = new Icon(this.scene, 0, 0, "discord", discordUrl);
    this.icons.push(this.discord);

    this.github = new Icon(this.scene, 0, 0, "github", githubUrl);
    this.icons.push(this.github);

    this.reddit = new Icon(this.scene, 0, 0, "reddit", redditUrl);
    this.icons.push(this.reddit);

    Phaser.Actions.IncX(this.icons, 0, this.ICON_WIDTH + 30);

    this.add(this.icons);
    this.setScale(1/6);
  }

  clear() {
    this.icons.forEach((icon: Icon) => icon.destroy());
  }
}

class Icon extends Phaser.GameObjects.Sprite {
  private readonly DEFAULT_ALPHA = 0.5;

  constructor(scene, x, y, texture, link) {
    super(scene, x, y, texture);
    this.setName(texture);
    this.setInteractive();
    this.setAlpha(this.DEFAULT_ALPHA);
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => {
      this.setAlpha(1);
      scene.ui.showTooltip("", texture, true);
    });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => {
      this.setAlpha(this.DEFAULT_ALPHA);
      scene.ui.hideTooltip();
    });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      window.open(link, "_blank").focus();
    });
  }

}
