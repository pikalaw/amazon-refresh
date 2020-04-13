import type {
  By as ByClass,
  ThenableWebDriver,
  WebElement,
} from "selenium-webdriver";

const readline = require("readline");
const webdriver = require("selenium-webdriver");
const By = webdriver.By;
const until = webdriver.until;

interface Credential {
  email: string;
  password: string;
}

async function getCredential(): Promise<Credential> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  function ask(question: string): Promise<string> {
    return new Promise<string>((resolve) => {
      rl.question(question, (answer: string) => resolve(answer));
    });
  }

  const email = await ask("Login email: ");
  const password = await ask("Login password: ");
  return { email, password };
}

async function readyElement(
  driver: ThenableWebDriver,
  locator: ByClass
): Promise<WebElement> {
  await driver.wait(until.elementLocated(locator));
  const element = await driver.findElement(locator);
  await driver.wait(until.elementIsVisible(element));
  await driver.wait(until.elementIsEnabled(element));
  return element;
}

async function readyClick(
  driver: ThenableWebDriver,
  element: WebElement
): Promise<void> {
  await driver.actions().move({ origin: element }).click(element).perform();
}

async function login(
  driver: ThenableWebDriver,
  credential: Credential
): Promise<void> {
  await driver.manage().window().maximize();
  await driver.get("https://www.amazon.com");

  const signin = await readyElement(driver, By.css('[data-nav-role="signin"]'));
  await readyClick(driver, signin);

  const email = await readyElement(driver, By.name("email"));
  await email.sendKeys(credential.email);

  const continueButton = await readyElement(driver, By.id("continue"));
  await readyClick(driver, continueButton);

  const password = await readyElement(driver, By.id("ap_password"));
  await password.sendKeys(credential.password);

  const signInSubmit = await readyElement(driver, By.id("signInSubmit"));
  await readyClick(driver, signInSubmit);
}

async function checkUntilAvailable(
  driver: ThenableWebDriver,
  buyBoxId: string,
  isAvailable: (driver: ThenableWebDriver) => Promise<boolean>,
  refreshPage: (driver: ThenableWebDriver) => Promise<void>
): Promise<void> {
  while (true) {
    const now = new Date();
    console.log(`Checking for ${buyBoxId} on ${now}`);
    const found: boolean = await isAvailable(driver);
    if (found) {
      break;
    }
    const waitCheckSec = Math.floor(Math.random() * 10 + 5);
    console.log(`Sigh... Trying again in ${waitCheckSec} seconds`);
    await driver.sleep(waitCheckSec * 1000);
    await refreshPage(driver);
  }
}

async function playYoutube(
  driver: ThenableWebDriver,
  videoId: string
): Promise<void> {
  // TODO: figure out if this can be done within webdriver directly.
  await driver.executeScript(
    `window.open("https://www.youtube.com/watch?v=${videoId}","_blank");`
  );
}

async function goToWholeFoodCart(driver: ThenableWebDriver): Promise<void> {
  const allCarts = await readyElement(driver, By.css("a#nav-cart"));
  await readyClick(driver, allCarts);

  const wholeFoodBuyBox = await readyElement(driver, By.id("sc-alm-buy-box"));
  const wholeFoodCheckoutButton = await wholeFoodBuyBox.findElement(
    By.css('input[name^="proceedToALMCheckout-"]')
  );
  await readyClick(driver, wholeFoodCheckoutButton);

  const continueButton = await readyElement(
    driver,
    By.css('a[name="proceedToCheckout"]')
  );
  await readyClick(driver, continueButton);

  const continue2Button = await readyElement(
    driver,
    By.css('#subsContinueButton input[type="submit"]')
  );
  await readyClick(driver, continue2Button);
}

async function lookForWholeFoodAvailability(
  driver: ThenableWebDriver
): Promise<boolean> {
  const availabilityMessageLocator = By.css(
    ".ufss-date-select-toggle-text-availability"
  );
  await driver.wait(until.elementLocated(availabilityMessageLocator));
  const availabilityMessages = await driver.findElements(
    availabilityMessageLocator
  );

  for (const availabilityMessage of availabilityMessages) {
    const text = await availabilityMessage.getText();
    console.log(text);
  }

  const availabilitySlots = await driver.findElements(
    By.css(".ufss-available")
  );
  return availabilitySlots.length > 0;
}

async function refreshWholeFoodPage(driver: ThenableWebDriver): Promise<void> {
  await driver.navigate().refresh();
}

async function doubleContinueOnFreshCart(driver: ThenableWebDriver): Promise<void> {
  const continueButton = await readyElement(
    driver,
    By.css('a[name="proceedToCheckout"]')
  );
  await readyClick(driver, continueButton);

  const continue2Button = await readyElement(
    driver,
    By.css('input[name="continue-bottom"][type="submit"]')
  );
  await readyClick(driver, continue2Button);
}

async function goToFreshCart(driver: ThenableWebDriver): Promise<void> {
  const allCarts = await readyElement(driver, By.css("a#nav-cart"));
  await readyClick(driver, allCarts);

  const freshBuyBox = await readyElement(driver, By.id("sc-fresh-buy-box"));
  const freshCheckoutButton = await freshBuyBox.findElement(
    By.css('input[name^="proceedToALMCheckout-"]')
  );
  await readyClick(driver, freshCheckoutButton);

  await doubleContinueOnFreshCart(driver);
}

async function lookForFreshAvailability(
  driver: ThenableWebDriver
): Promise<boolean> {
  const availabilityMessageLocator = By.css(
    "#slot-container-UNATTENDED .a-size-base-plus"
  );
  await driver.wait(until.elementLocated(availabilityMessageLocator));
  const availabilityMessages = await driver.findElements(
    availabilityMessageLocator
  );

  for (const availabilityMessage of availabilityMessages) {
    const text = await availabilityMessage.getText();
    console.log(text);
    if (!text.includes("No doorstep delivery windows")) {
      return true;
    }
  }

  return false;
}

async function refreshFreshPage(driver: ThenableWebDriver): Promise<void> {
  // Refreshing the page prompts the user to resubmit the form, which webdriver
  // does not seem to have a way to do so.
  // But this trick below bypasses that.
  await driver.navigate().back();
  await driver.navigate().back();
  await driver.navigate().refresh();
  await doubleContinueOnFreshCart(driver);
}

type ProductName = string;
type GoToCartFunction = (d: ThenableWebDriver) => Promise<void>;
type CheckAvailableFunction = (d: ThenableWebDriver) => Promise<boolean>;
type RefreshFunction = (d: ThenableWebDriver) => Promise<void>;

function getAmazonProductCallbacks(): [
  ProductName,
  GoToCartFunction,
  CheckAvailableFunction,
  RefreshFunction
] {
  switch (process.argv[2]) {
    case "wholefood":
      return [
        "WholeFood",
        goToWholeFoodCart,
        lookForWholeFoodAvailability,
        refreshWholeFoodPage,
      ];
    case "fresh":
      return [
        "Fresh",
        goToFreshCart,
        lookForFreshAvailability,
        refreshFreshPage,
      ];
    default:
      throw `Unknown Amazon product ${process.argv[2]}.`;
  }
}

async function main(): Promise<void> {
  const driver: ThenableWebDriver = new webdriver.Builder()
    .forBrowser("safari")
    .build();
  const credential = await getCredential();
  await login(driver, credential);

  const [
    productName,
    goToCart,
    checkAvailable,
    refresh,
  ] = getAmazonProductCallbacks();
  await goToCart(driver);
  // Allow the cart page to load first.
  await driver.sleep(10 * 1000);
  await checkUntilAvailable(driver, productName, checkAvailable, refresh);

  console.log("Found!");
  await playYoutube(driver, "dCE4y9O7vTM");

  // Leave the window open to allow the human to come see the screen.
  await driver.sleep(10 * 60 * 1000); // 10 minutes.
  await driver.close();
}

main()
  .then(() => console.log("Done!"))
  .catch((reason) => console.log(`Sad refresher: ${reason}.`));
