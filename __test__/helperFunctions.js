module.exports.testResponseText = function testResponseText(
  responseText,
  expectedToContain
) {
  expect(responseText.toLowerCase()).toEqual(
    expect.stringContaining(expectedToContain)
  );
};
