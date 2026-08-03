export function withSoftDelete(schema) {
  schema.add({
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  });

  schema.pre(/^find/, function (next) {
    if (!this.getFilter().includeDeleted) {
      this.where({ isDeleted: false });
    } else {
      // strip the helper flag so Mongo doesn't try to match it
      const filter = this.getFilter();
      delete filter.includeDeleted;
    }
    next();
  });

  schema.methods.softDelete = function () {
    this.isDeleted = true;
    this.deletedAt = new Date();
    return this.save();
  };

  schema.methods.restore = function () {
    this.isDeleted = false;
    this.deletedAt = undefined;
    return this.save();
  };
}
