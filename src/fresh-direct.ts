import type {
  By as ByClass,
  ThenableWebDriver,
  WebElement,
} from "selenium-webdriver";

const readline = require("readline");
const webdriver = require("selenium-webdriver");
const By = webdriver.By;
const Key = webdriver.Key;
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
  await driver.get("https://www.freshdirect.com");
  await driver.navigate().to("https://www.freshdirect.com/login/login.jsp");

  const email = await readyElement(driver, By.id("email"));
  await email.sendKeys(credential.email);

  const password = await readyElement(driver, By.id("password"));
  await password.sendKeys(credential.password);

  const signInSubmit = await readyElement(driver, By.id("signinbtn"));
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
    const waitCheckSec = Math.floor(Math.random() * 20 + 10);
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

async function goToFreshDirectCart(driver: ThenableWebDriver): Promise<void> {
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

async function lookForFreshDirectAvailability(
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

async function refreshFreshDirectPage(
  driver: ThenableWebDriver
): Promise<void> {
  await driver.navigate().refresh();
}

async function main(): Promise<void> {
  const driver: ThenableWebDriver = new webdriver.Builder()
    .forBrowser("safari")
    .build();
  const credential = await getCredential();
  await login(driver, credential);
/*
  await goToFreshDirectCart(driver);
  // Allow the cart page to load first.
  await driver.sleep(10 * 1000);
  await checkUntilAvailable(
    driver,
    "Fresh Direct",
    lookForFreshDirectAvailability,
    refreshFreshDirectPage
  );
*/
  console.log("Found!");
  await playYoutube(driver, "dCE4y9O7vTM");

  // Leave the window open to allow the human to come see the screen.
  await driver.sleep(10 * 60 * 1000); // 10 minutes.
  await driver.close();
}

main()
  .then(() => console.log("Done!"))
  .catch((reason) => console.log(`Sad refresher: ${reason}.`));
