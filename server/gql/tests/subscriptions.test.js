const { SUBSCRIPTION_TOPICS } = require('@server/utils/constants');
const { getResponse } = require('@server/utils/testUtils');
const { gql } = require('apollo-server-core');
const { graphql, GraphQLSchema } = require('graphql');
const { get } = require('lodash');
const { QueryRoot } = require('../queries');
const { SubscriptionRoot } = require('../subscriptions');

const schema = new GraphQLSchema({ subscription: SubscriptionRoot, query: QueryRoot });

describe('subscriptions tests', () => {
  it('should schema contains subscription field notifications', async () => {
    const source = `
      query {
        __schema {
          subscriptionType {
            fields {
              name
            }
          }
        }
      }
    `;

    const result = await graphql({ source, schema });
    const fieldNames = get(result, 'data.__schema.subscriptionType.fields');
    expect(fieldNames.length).not.toBe(0);
    expect(get(fieldNames[0], 'name')).toBe(SUBSCRIPTION_TOPICS.NOTIFICATIONS);
  });

  it('should subscribe for notificationbs', async () => {
    const args = {
      scheduleIn: 1000,
      message: 'Hello'
    };
    const notificationSub = gql`
      subscription Notifications {
        notifications (scheduleIn: ${args.scheduleIn}, message: "${args.message}") {
          success
        }
      }
    `;

    const result = await getResponse(notificationSub);
    console.log(result);
  });
});
