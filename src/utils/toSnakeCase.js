const toSnake = (str) => str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

export const toSnakeCaseTransform = (_doc, ret) => {
  const transformed = {};

  Object.keys(ret).forEach((key) => {
    if (key === '_id') {
      transformed.id = ret._id.toString();
    } else if (key !== '__v') {
      transformed[toSnake(key)] = ret[key];
    }
  });

  return transformed;
};
