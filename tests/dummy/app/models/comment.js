import { belongsTo } from 'ember-data/relationships';
import Model from 'ember-data/model';
import attr from 'ember-data/attr';

export default Model.extend({
  message: attr('string'),
  timestamp: attr('number'),
  post: belongsTo('post'),
});
