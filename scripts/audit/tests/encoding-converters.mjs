/**
 * Functional specs for the 19 tools of the encoding-converters engine.
 *
 * Every spec drives the real UI in Chrome: it types into the real input
 * textarea, picks a base in the real <select> or presses the real
 * "Switch Direction" button and reads the rendered output textarea.
 *
 * Expected values come from the definitions of the numeral systems (positional
 * notation), from ITU-R M.1677-1 for Morse code, from the sRGB colour model
 * for the colour converters and from the URL encoding rules of RFC 3986 -
 * never from this site's own implementation.
 */

import {
  spec,
  fillArea,
  selectOption,
  clickButton,
  assertEqual,
} from "../lib/test-helpers.mjs";

/** The value of the rendered output textarea. */
async function output(page) {
  return page.locator("main textarea").nth(1).inputValue();
}

/** Type a value into the input textarea and read the converted result. */
async function convert(page, value) {
  await fillArea(page, value);
  return output(page);
}

export function register() {
  spec("binary-to-decimal", "converts 1010 binary to 10 decimal", async (page) => {
    // 1*2^3 + 0*2^2 + 1*2^1 + 0*2^0 = 8 + 2 = 10
    assertEqual(await convert(page, "1010"), "10", "decimal value");
  });

  spec("binary-to-hex", "converts 11111111 binary to FF hexadecimal", async (page) => {
    // 255 = 15*16 + 15 -> FF
    assertEqual(await convert(page, "11111111"), "FF", "hexadecimal value");
  });

  spec("binary-translator", "translates text to 8-bit binary and back", async (page) => {
    // "Hi" is H = 0x48 = 01001000 and i = 0x69 = 01101001.
    assertEqual(await convert(page, "Hi"), "01001000 01101001", "binary bytes");

    // And back again through the real direction toggle.
    await fillArea(page, "01001000 01101001");
    await clickButton(page, "Switch Direction");
    assertEqual(await output(page), "Hi", "text from binary bytes");
  });

  spec("decimal-to-binary", "converts 10 decimal to 1010 binary", async (page) => {
    // 10 = 8 + 2 = 2^3 + 2^1 -> 1010
    assertEqual(await convert(page, "10"), "1010", "binary value");
  });

  spec("decimal-to-hex", "converts 255 decimal to FF hexadecimal", async (page) => {
    assertEqual(await convert(page, "255"), "FF", "hexadecimal value");
  });

  spec("hex-rgb-converter", "converts #FF0000 to rgb(255, 0, 0)", async (page) => {
    // #FF0000 -> red 255, green 0, blue 0.
    assertEqual(await convert(page, "#FF0000"), "rgb(255, 0, 0)", "rgb value");
  });

  spec("hex-to-ascii", "decodes the hex bytes 48656C6C6F to Hello", async (page) => {
    // 48 = 'H', 65 = 'e', 6C = 'l', 6C = 'l', 6F = 'o'.
    assertEqual(await convert(page, "48656C6C6F"), "Hello", "decoded text");
  });

  spec("hex-to-binary", "converts FF hexadecimal to 11111111 binary", async (page) => {
    assertEqual(await convert(page, "FF"), "11111111", "binary value");
  });

  spec("hex-to-decimal", "converts FF hexadecimal to 255 decimal", async (page) => {
    assertEqual(await convert(page, "FF"), "255", "decimal value");
  });

  spec("hex-to-rgb", "converts #00FF00 to rgb(0, 255, 0)", async (page) => {
    assertEqual(await convert(page, "#00FF00"), "rgb(0, 255, 0)", "rgb value");
  });

  spec("hex-to-rgb-calculator", "converts #0000FF to rgb(0, 0, 255)", async (page) => {
    assertEqual(await convert(page, "#0000FF"), "rgb(0, 0, 255)", "rgb value");
  });

  spec("morse-code-translator", "translates SOS to Morse code and back", async (page) => {
    // ITU-R M.1677-1: S = "...", O = "---".
    assertEqual(await convert(page, "SOS"), "... --- ...", "morse code");

    await fillArea(page, "... --- ...");
    await clickButton(page, "Switch Direction");
    assertEqual(await output(page), "SOS", "text from morse code");
  });

  spec("number-base-converter", "converts between the bases that are picked", async (page) => {
    // From Decimal to Binary, then From Decimal to Hexadecimal.
    await fillArea(page, "10");
    assertEqual(await output(page), "1010", "decimal to binary");

    await selectOption(page, "16", 1);
    assertEqual(await output(page), "A", "decimal to hexadecimal");

    // From Hexadecimal back to Octal: 0x1F = 31 = 0o37.
    await selectOption(page, "16", 0);
    await fillArea(page, "1F");
    await selectOption(page, "8", 1);
    assertEqual(await output(page), "37", "hexadecimal to octal");
  });

  spec("rgb-hex-converter", "converts rgb(255, 0, 0) to #FF0000", async (page) => {
    assertEqual(await convert(page, "255, 0, 0"), "#FF0000", "hex value");
  });

  spec("rgb-to-hex", "converts rgb(0, 128, 255) to #0080FF", async (page) => {
    assertEqual(await convert(page, "0, 128, 255"), "#0080FF", "hex value");
  });

  spec("rgb-to-hex-calculator", "converts rgb(255, 255, 0) to #FFFF00", async (page) => {
    assertEqual(await convert(page, "255, 255, 0"), "#FFFF00", "hex value");
  });

  spec("url-decoder", "decodes Hello%20World%21 to Hello World!", async (page) => {
    // RFC 3986: %20 is a space and %21 is "!".
    assertEqual(await convert(page, "Hello%20World%21"), "Hello World!", "decoded text");
  });

  spec("url-encoder", "percent-encodes the characters a URI may not carry", async (page) => {
    // RFC 3986 section 2.1/2.5: a space becomes %20, "&" becomes %26, "%"
    // becomes %25 and the non-ASCII "e-acute" is UTF-8 percent-encoded as
    // %C3%A9.
    assertEqual(await convert(page, "café & 100%"), "caf%C3%A9%20%26%20100%25", "encoded text");
  });

  spec("url-encoder-decoder", "encodes and decodes through the direction toggle", async (page) => {
    // RFC 3986: a space becomes %20 and "&" becomes %26.
    assertEqual(await convert(page, "a b&c"), "a%20b%26c", "encoded text");

    await clickButton(page, "Switch Direction");
    assertEqual(await output(page), "a b&c", "decoded text");
  });
}
