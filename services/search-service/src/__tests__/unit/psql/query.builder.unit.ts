import {buildTestsRunner} from '../runner';
import {PsqlQueryBuilder} from '../../../classes';
import {expect} from '@loopback/testlab';
import {testModelList, testModelListWithIdentifier} from '../..';

describe('PostgreSQL QueryBuilder', () => {
  describe(
    'with match parameter',
    buildTestsRunner(
      PsqlQueryBuilder,
      [
        {
          params: {},
          it: 'should build a query with no options',
          expects:
            "(SELECT description, name, 'TestSearched' as source, ts_rank_cd(to_tsvector(public.f_concat_ws(' ', description, name)), to_tsquery($1)) as rank" +
            " from public.TestSearched where to_tsvector(public.f_concat_ws(' ', description, name)) @@ to_tsquery($1))" +
            ' UNION ALL ' +
            "(SELECT about as description, identifier as name, 'TestSearchedCustom' as source, ts_rank_cd(to_tsvector(public.f_concat_ws(' ', about, identifier)), to_tsquery($1)) as rank" +
            " from public.TestSearchedCustom where to_tsvector(public.f_concat_ws(' ', about, identifier)) @@ to_tsquery($1))" +
            ' ORDER BY rank DESC',
        },
      ],
      'match',
      ['match:*'],
      expect,
      testModelList,
    ),
  );
  describe(
    'with custom identifier',
    buildTestsRunner(
      PsqlQueryBuilder,
      [
        {
          params: {},
          it: 'should build a query with no options',
          expects:
            "(SELECT description, name, 'TestSearched' as source, ts_rank_cd(to_tsvector(public.f_concat_ws(' ', description, name)), to_tsquery($1)) as rank" +
            " from public.TestSearched where to_tsvector(public.f_concat_ws(' ', description, name)) @@ to_tsquery($1))" +
            ' UNION ALL ' +
            "(SELECT about as description, identifier as name, 'TestSearchedCustom' as source, ts_rank_cd(to_tsvector(public.f_concat_ws(' ', about, identifier)), to_tsquery($1)) as rank" +
            " from public.TestSearchedCustom where to_tsvector(public.f_concat_ws(' ', about, identifier)) @@ to_tsquery($1))" +
            ' UNION ALL ' +
            "(SELECT about as description, identifier as name, 'CustomIdentifier' as source, ts_rank_cd(to_tsvector(public.f_concat_ws(' ', about, identifier)), to_tsquery($1)) as rank" +
            " from public.TestSearchedCustom where to_tsvector(public.f_concat_ws(' ', about, identifier)) @@ to_tsquery($1))" +
            ' ORDER BY rank DESC',
        },
      ],
      'match',
      ['match:*'],
      expect,
      testModelListWithIdentifier,
    ),
  );
});
