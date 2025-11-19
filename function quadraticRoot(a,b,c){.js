function quadraticRoot(a, b, c) {
  if (discriminant < 0) {
    return "Complex Roots.";
  }
  //store the statements in a variable
  const positiveRoot = ((-b * Math.sqrt(discriminant)) / 2) * a;
  const negativeRoot = ((-b - Math.sqrt(discriminant)) / 2) * a;
  //return the Positive Root value and the NegativeRoot value
  return [positiveRoot, negativeRoot];
}
//print result in the console
console.log(quadraticRoot(1, -3, 2));
//function that prints Squareroot of any number
function squareRoot(num) {
  return Math.sqrt(num);
}
console.log(squareRoot(4));
