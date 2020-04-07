import type { ThenableWebDriver, WebElement, By as ByClass } from "selenium-webdriver";
export {}

const readline = require('readline');
const webdriver = require("selenium-webdriver");
const By = webdriver.By;
const until = webdriver.until;
const Key = webdriver.Key;

interface Credential {
  email: string;
  password: string;
}

async function getCredential(): Promise<Credential> {
  let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  function ask(question: string) {
    return new Promise<string>((resolve) => {
      rl.question(question, answer => resolve(answer));
    });
  }

  const email = await ask('Login email: ');
  const password = await ask('Login password: ');

  return {email, password};
}

async function readyElement(driver: ThenableWebDriver, locator: ByClass) {
  await driver.wait(until.elementLocated(locator));
  const element = await driver.findElement(locator);
  await driver.wait(until.elementIsVisible(element));
  await driver.wait(until.elementIsEnabled(element));
  return element;
}

async function readyClick(driver: ThenableWebDriver, element: WebElement) {
  await driver.actions().move({origin: element}).click(element).perform();
}

async function login(driver: ThenableWebDriver, credential: Credential) {
  await driver.get("https://www.amazon.com");

  const signin = await readyElement(driver, By.css('[data-nav-role="signin"]'))
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

async function goToCart(driver: ThenableWebDriver) {
  const allCarts = await readyElement(driver, By.css("a#nav-cart"));
  await readyClick(driver, allCarts);

  const wholeFoodBuyBox = await readyElement(driver, By.id("sc-alm-buy-box"));
  const wholeFoodCheckoutButton = await wholeFoodBuyBox.findElement(
      By.css('input[name^="proceedToALMCheckout-"]'));
  await readyClick(driver, wholeFoodCheckoutButton);

  const continueButton = await readyElement(
      driver, By.css('a[name="proceedToCheckout"]'));
  await readyClick(driver, continueButton);

  const continue2Button = await readyElement(
      driver, By.css('#subsContinueButton input[type="submit"]'));
  await readyClick(driver, continue2Button);
}

async function lookForAvailability(driver: ThenableWebDriver) {
  const availabilityMessageLocator = By.css(
      ".ufss-date-select-toggle-text-availability");
  await driver.wait(until.elementLocated(availabilityMessageLocator));
  const availabilityMessages = await driver.findElements(
      availabilityMessageLocator);

  for (const availabilityMessage of availabilityMessages) {
    const text = await availabilityMessage.getText();
    console.log(text);
  }

  const availabilitySlots = await driver.findElements(
      By.css(".ufss-available"));

  return availabilitySlots.length > 0;
}

async function playYoutube(driver: ThenableWebDriver) {
  // TODO: figure out if this can be done within webdriver directly.
  await driver.executeScript(
      'window.open("https://www.youtube.com/watch?v=dCE4y9O7vTM","_blank");');
}

async function main() {
  const driver = new webdriver.Builder()
      .forBrowser("safari")
      .build();

  await driver.manage().window().maximize();

  const credential = await getCredential();
  await login(driver, credential);

  await goToCart(driver);

  const waitCheckSec = 20;
  while (true) {
    const now = new Date();
    console.log(`Checking on ${now}`);
    const found: boolean = await lookForAvailability(driver);
    if (found) {
      break;
    }
    console.log(`Sigh... Trying again in ${waitCheckSec} seconds`);
    await driver.sleep(waitCheckSec * 1000);
    await driver.navigate().refresh();
  }

  console.log("Found!");
  await playYoutube(driver);

  // Leave the window open to allow the human to come see the screen.
  await driver.sleep(10 * 60 * 1000);  // 10 minutes.
  await driver.close();
}

main()
  .then(() => console.log('Done!'))
  .catch((reason) => console.log(`Sad refresher: ${reason}.`));
