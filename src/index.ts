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
  await driver.wait(until.elementIsVisible(element));
  await driver.wait(until.elementIsEnabled(element));
  return element;
}

async function login(driver: ThenableWebDriver, credential: Credential) {
  await driver.get("https://www.amazon.com");

  const signin = await readyElement(driver, By.css('[data-nav-role="signin"]'))
  await signin.click();

  const email = await readyElement(driver, By.name("email"));
  await email.sendKeys(credential.email);

  const password = await readyElement(driver, By.name("password"));
  await password.sendKeys(credential.password);

  const submit = await readyElement(driver, By.id("signInSubmit"));
  await submit.click();
}

async function main() {
  const driver = new webdriver.Builder()
      .forBrowser("safari")
      .build();

	const credential = await getCredential();
  await login(driver, credential);
}

main()
  .then(() => console.log('Done!'))
  .catch((reason) => console.log(`Sad refresher: ${reason}.`));
