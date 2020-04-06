import type { ThenableWebDriver, WebElement, By as ByClass } from "selenium-webdriver";
export {}

const readline = require('readline');
const webdriver = require("selenium-webdriver");
const By = webdriver.By;
const until = webdriver.until;

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
  // await driver.wait(until.elementIsVisible(element));
  await driver.wait(until.elementIsEnabled(element));
  return element;
}

async function login(driver: ThenableWebDriver, credential: Credential) {
  await driver.get("https://www.amazon.com");

  const signin = await readyElement(driver, By.css('[data-nav-role="signin"]'))
  await signin.click();

  const email = await readyElement(driver, By.name("email"));
  await email.sendKeys(credential.email);

  const continueButton = await readyElement(driver, By.id("continue"));
  await continueButton.click();

  const password = await readyElement(driver, By.id("ap_password"));
  await password.sendKeys(credential.password);

  const signInSubmit = await readyElement(driver, By.id("signInSubmit"));
  await signInSubmit.click();
}

async function goToCart(driver: ThenableWebDriver) {
  const allCarts = await readyElement(driver, By.css("a#nav-cart"));
  await allCarts.click();

  const wholeFoodBuyBox = await readyElement(driver, By.id("sc-alm-buy-box"));
  const wholeFoodCheckoutButton = await wholeFoodBuyBox.findElement(
      By.css('input[name^="proceedToALMCheckout-"]'));
  await wholeFoodCheckoutButton.click();

  const continueButton = await readyElement(
      driver, By.css('a[name="proceedToCheckout"]'));
  await continueButton.click();

  const continue2Button = await readyElement(
      driver, By.css('#subsContinueButton input[type="submit"]'));
  await continue2Button.click();
}

async function main() {
  const driver = new webdriver.Builder()
      .forBrowser("safari")
      .build();

  await driver.manage().window().maximize();

  const credential = await getCredential();
  await login(driver, credential);

  await goToCart(driver);

  await driver.sleep(60 * 1000);
}

main()
  .then(() => console.log('Done!'))
  .catch((reason) => console.log(`Sad refresher: ${reason}.`));
