import { describe, expect, it } from 'vitest';
import { prototypeReviewFlags } from '../../functions/src/prototypeRecordReview';

describe('legacy prototype data review', () => {
  it('flags former defaults as review clues without deciding a real record is invalid', () => {
    const genuineRecord = {
      id: 'genuine-10-hectares',
      surfaceHa: 10,
      lat: -27.4862,
      lng: -55.1205,
      tenureType: 'propiedad_con_titulo',
      locationCapturedAt: '2026-01-01T00:00:00.000Z',
      locationCapturedBy: 'survey-team',
      locationMethod: 'gps_auto'
    };
    expect(prototypeReviewFlags(genuineRecord)).toEqual([
      'former-default-surface:10',
      'former-default-map-coordinates'
    ]);
  });

  it('leaves ordinary unknown measurements unflagged', () => {
    expect(prototypeReviewFlags({ surfaceHa: null, lat: null, lng: null, tenureType: null })).toEqual([]);
  });
});
