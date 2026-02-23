import { describe, expect, it } from 'vitest';
import { parse, tokenize, type FeatureNode } from '../../../vero-lang/src/index.ts';
import { collectDataRefsFromFeatures } from '../routes/veroDataReferenceExtraction.utils';

function collectRefs(source: string) {
    const lexResult = tokenize(source);
    expect(lexResult.errors).toHaveLength(0);

    const parseResult = parse(lexResult.tokens);
    expect(parseResult.errors).toHaveLength(0);

    return collectDataRefsFromFeatures((parseResult.ast.features || []) as FeatureNode[]);
}

describe('collectDataRefsFromFeatures', () => {
    it('ignores comment text that resembles data statements', () => {
        const refs = collectRefs(`
            # COUNT Table WHERE username = "tomsmith"
            FEATURE CommentOnly {
                SCENARIO NoData {
                    LOG "no data references"
                }
            }
        `);

        expect(refs).toEqual([]);
    });

    it('does not treat VERIFY COUNT assertion grammar as data table references', () => {
        const refs = collectRefs(`
            PAGE AssertPage {
                FIELD target = CSS ".target"
            }

            FEATURE AssertionOnly {
                SCENARIO CountAssertions {
                    VERIFY ELEMENT COUNT OF AssertPage.target IS 3
                    VERIFY AssertPage.target HAS COUNT 3
                }
            }
        `);

        expect(refs).toEqual([]);
    });

    it('extracts ROW table names correctly when FIRST/LAST/RANDOM modifiers are used', () => {
        const refs = collectRefs(`
            FEATURE RowModifiers {
                SCENARIO DataRows {
                    ROW firstCred = FIRST LoginCredentials WHERE username = "tomsmith"
                    ROW lastCred = LAST LoginCredentials WHERE username = "tomsmith"
                    ROW randomCred = RANDOM LoginCredentials WHERE username = "tomsmith"
                }
            }
        `);

        expect(refs).toHaveLength(3);
        expect(refs.map(ref => ref.tableName)).toEqual([
            'LoginCredentials',
            'LoginCredentials',
            'LoginCredentials',
        ]);
        expect(refs.every(ref => !['FIRST', 'LAST', 'RANDOM'].includes(ref.tableName))).toBe(true);
    });

    it('ignores LOAD statements for VDQL-only data warning extraction', () => {
        const refs = collectRefs(`
            FEATURE LoadIgnored {
                SCENARIO DataLoadOnly {
                    LOAD byEquals FROM "LoginCredentials" WHERE username = "tomsmith"
                    LOAD byIs FROM "LoginCredentials" WHERE active IS TRUE
                }
            }
        `);

        expect(refs).toEqual([]);
    });

    it('extracts columns from complex ROWS WHERE + ORDER BY conditions', () => {
        const refs = collectRefs(`
            FEATURE RowsOperators {
                SCENARIO ComplexRows {
                    ROWS filtered = LoginCredentials WHERE NOT (username CONTAINS "blocked") AND status IN ["active", "pending"] OR notes IS NULL ORDER BY username ASC, state DESC LIMIT 10 OFFSET 1
                }
            }
        `);

        expect(refs).toHaveLength(1);
        expect(new Set(refs[0].columns)).toEqual(new Set(['username', 'status', 'notes', 'state']));
    });

    it('preserves projectName for cross-project references so callers can skip local warnings', () => {
        const refs = collectRefs(`
            FEATURE CrossProject {
                SCENARIO ProjectRef {
                    ROW externalCred FROM DemoProject.LoginCredentials WHERE username = "tomsmith"
                }
            }
        `);

        expect(refs).toHaveLength(1);
        expect(refs[0]).toMatchObject({
            tableName: 'LoginCredentials',
            projectName: 'DemoProject',
            columns: ['username'],
        });
    });
});
