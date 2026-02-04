import { ExpediaBrand } from './types';

export interface BrandTargetAudience {
  name: string;
  description: string;
  avgAge: number;
  percentOfTravelers: number;
  percentOfSpend: number;
  keyValues: string[];
}

export interface BrandPillar {
  name: string;
  description: string;
}

export interface BrandCriteria {
  key: ExpediaBrand;
  name: string;
  tagline: string;
  targetAudience: BrandTargetAudience;
  brandPillars: BrandPillar[];
  reasonsToBuy: string[];
}

export const BRAND_CRITERIA: Record<ExpediaBrand, BrandCriteria> = {
  expedia: {
    key: 'expedia',
    name: 'Expedia',
    tagline: 'Your co-Pilot for confident & in-control travel',
    targetAudience: {
      name: 'Quality Seekers',
      description:
        "Savvy travel planners who value platforms that match their level of expertise. These professionals with high disposable income want flexible, smart tools that give them a sense of control, value, and confidence. They're not looking for an easy travel platform; they're looking for a powerful, seamless one.",
      avgAge: 43,
      percentOfTravelers: 17,
      percentOfSpend: 26,
      keyValues: ['Control', 'Intelligent tools', 'Flexibility', 'Rewards', 'Seamless experience'],
    },
    brandPillars: [
      {
        name: 'All-in-One Travel Shop',
        description: 'Bundle & Save, Flexible Add-On Benefits, Most Complete Marketplace',
      },
      {
        name: 'Intelligent Travel Tools',
        description: 'Price Tracking, Price Drop Protection, Property Compare',
      },
      {
        name: 'Rewarding Travel Partner',
        description: 'One Key Loyalty Rewards, Frequent Flyer Flexibility, 24/7 Support',
      },
    ],
    reasonsToBuy: ['Bundle & Save', 'Price Tracking', 'One Key Loyalty Rewards', '24/7 Support'],
  },
  hotels_com: {
    key: 'hotels_com',
    name: 'Hotels.com',
    tagline: 'Simply the Best Way to Hotel',
    targetAudience: {
      name: 'Savvy Trip Takers',
      description:
        'Young professionals who travel frequently including leisure, business and bleisure. They need an OTA they can trust to provide a hassle-free experience and a variety of good value options. They take advantage of loyalty programs and choose destinations that will make their friends and followers jealous.',
      avgAge: 31,
      percentOfTravelers: 19,
      percentOfSpend: 20,
      keyValues: ['Simplicity', 'Flexibility', 'Rewards', 'Transparency', 'Value'],
    },
    brandPillars: [
      { name: 'Simple', description: 'Price Confidence Tools, Hotel Comparison, No Hidden Fees' },
      { name: 'Flexible', description: 'Free Cancellation, Flex Date Search, Payment Options' },
      { name: 'Rewards', description: '10:1 rewards, No Restrictions, Member Prices' },
    ],
    reasonsToBuy: ['Price Confidence Tools', 'Free Cancellation', '10:1 Rewards', 'Member Prices'],
  },
  vrbo: {
    key: 'vrbo',
    name: 'Vrbo',
    tagline: 'Travel is about connecting with loved ones',
    targetAudience: {
      name: 'Group Planners',
      description:
        'Avid planners intent on organizing trips that please the whole family. Planning gives them peace of mind so they can relax and have a better time during the trip. They are value-driven and will actively research special offers and deals.',
      avgAge: 46,
      percentOfTravelers: 14,
      percentOfSpend: 13,
      keyValues: ['Family focus', 'Planning', 'Value', 'Togetherness', 'Experiences'],
    },
    brandPillars: [
      {
        name: 'Family-Focused',
        description: 'Whole-home rentals, Space for everyone, Kid-friendly options',
      },
      {
        name: 'Value-Driven',
        description: 'Package deals, Early booking savings, Group cost-sharing',
      },
      {
        name: 'Experience-Oriented',
        description: 'Activities for all ages, Memory-making, Destination variety',
      },
    ],
    reasonsToBuy: ['Whole-home rentals', 'Family-friendly', 'Group travel', 'Package deals'],
  },
};

export function getBrandContextForPrompt(brand: ExpediaBrand): string {
  const criteria = BRAND_CRITERIA[brand];
  const ta = criteria.targetAudience;

  return `This is a ${criteria.name} campaign targeting ${ta.name}.

${ta.description}

Key values this audience prioritises: ${ta.keyValues.join(', ')}

Brand pillars: ${criteria.brandPillars.map((p) => p.name).join(', ')}`;
}
