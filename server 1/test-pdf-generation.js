const { generatePdf } = require('./src/pdf/pdf.service');

// Dummy inspection data matching PROPCHK format
const dummyInspectionJson = {
  inspection_id: 'INS-00005107',
  metadata: {
    client_name: 'Mr. Hariprasad Sonti',
    property_address: 'T 6 - 1307, My Home Tridasa, Hyderabad, TG, 502032',
    technician: {
      id: 'EMP001',
      name: 'Cheenuru Rahul'
    },
    verifier: {
      name: 'Ketan Kumar'
    },
    water_ph: 7.2,
    water_tds: 186,
    brands: {
      switchboards: 'Legrand',
      fan: 'Crompton',
      lightFixtures: 'GM',
      ac: 'Blue Star'
    }
  },
  audit: {
    created_at: '2024-08-09T10:00:00.000Z',
    last_modified_at: '2024-08-09T14:30:00.000Z',
    status: 'SUBMITTED'
  },
  rooms: [
    {
      room_id: 'BEDROOM_1',
      room_type: 'BEDROOM',
      room_label: 'BEDROOM 1',
      length: 12.5,
      width: 10.8,
      scored: true,
      items: [
        {
          item_id: 'BEDROOM_1_FLOORING_1',
          label: 'Gap observed between tiles',
          category: 'Flooring',
          status: 'MINOR',
          remarks: 'Small gap between vitrified tiles near the window',
          photos: []
        },
        {
          item_id: 'BEDROOM_1_DOORS_1',
          label: 'Door handle loose',
          category: 'Doors',
          status: 'MINOR',
          remarks: 'Door handle needs tightening',
          photos: []
        },
        {
          item_id: 'BEDROOM_1_WINDOWS_1',
          label: 'Window fittings not operating smoothly',
          category: 'Windows',
          status: 'COSMETIC',
          remarks: 'Window requires lubrication',
          photos: []
        }
      ]
    },
    {
      room_id: 'BEDROOM_2',
      room_type: 'BEDROOM',
      room_label: 'BEDROOM 2',
      length: 12.5,
      width: 10.8,
      scored: true,
      items: [
        {
          item_id: 'BEDROOM_2_WALLFINISH_1',
          label: 'Shade variation observed on the walls',
          category: 'Wall Finish',
          status: 'COSMETIC',
          remarks: 'Minor paint shade difference',
          photos: []
        }
      ]
    },
    {
      room_id: 'BEDROOM_3',
      room_type: 'BEDROOM',
      room_label: 'BEDROOM 3',
      length: 11.5,
      width: 10.8,
      scored: true,
      items: []
    },
    {
      room_id: 'BATHROOM_1',
      room_type: 'BATHROOM',
      room_label: 'BATHROOM 1',
      length: 6.8,
      width: 5.6,
      scored: true,
      items: [
        {
          item_id: 'BATHROOM_1_PLUMBING_1',
          label: 'Water leakage observed near tap',
          category: 'Plumbing',
          status: 'MAJOR',
          remarks: 'Requires immediate attention',
          photos: []
        }
      ]
    },
    {
      room_id: 'BATHROOM_2',
      room_type: 'BATHROOM',
      room_label: 'BATHROOM 2',
      length: 6.8,
      width: 5.6,
      scored: true,
      items: []
    },
    {
      room_id: 'KITCHEN',
      room_type: 'KITCHEN',
      room_label: 'KITCHEN',
      length: 12.5,
      width: 9.1,
      scored: true,
      items: [
        {
          item_id: 'KITCHEN_WINDOWS_1',
          label: 'Window fittings not operating smoothly',
          category: 'Windows',
          status: 'MINOR',
          remarks: 'Window needs adjustment',
          photos: []
        },
        {
          item_id: 'KITCHEN_WALLFINISH_1',
          label: 'Shade variation observed at a small portion of the walls',
          category: 'Wall Finish',
          status: 'COSMETIC',
          remarks: 'Minor paint touch-up needed',
          photos: []
        }
      ]
    },
    {
      room_id: 'LIVING_ROOM',
      room_type: 'LIVING_ROOM',
      room_label: 'LIVING ROOM',
      length: 18.5,
      width: 14.2,
      scored: true,
      items: [
        {
          item_id: 'LIVING_ROOM_DOORS_1',
          label: 'Polishing / painting not done on the side of the shutter',
          category: 'Doors',
          status: 'COSMETIC',
          remarks: 'Finish incomplete on door edge',
          photos: []
        },
        {
          item_id: 'LIVING_ROOM_WINDOWS_1',
          label: 'Stains observed on glass',
          category: 'Windows',
          status: 'COSMETIC',
          remarks: 'Glass cleaning required',
          photos: []
        }
      ]
    },
    {
      room_id: 'BALCONY_1',
      room_type: 'BALCONY',
      room_label: 'BALCONY 1',
      length: 8.9,
      width: 6.2,
      scored: true,
      items: [
        {
          item_id: 'BALCONY_1_DOORS_1',
          label: 'Scratches observed on glass',
          category: 'Doors',
          status: 'COSMETIC',
          remarks: 'Minor scratches on balcony door glass',
          photos: []
        }
      ]
    },
    {
      room_id: 'UTILITY',
      room_type: 'UTILITY',
      room_label: 'UTILITY',
      length: 6.8,
      width: 5.5,
      scored: true,
      items: [
        {
          item_id: 'UTILITY_FLOORING_1',
          label: 'Gap observed between granite stone and wall',
          category: 'Flooring',
          status: 'MINOR',
          remarks: 'Sealant needed',
          photos: []
        }
      ]
    }
  ]
};

async function testPdfGeneration() {
  try {
    console.log('🚀 Starting PDF generation with dummy data...');
    console.log('📄 Property:', dummyInspectionJson.metadata.property_address);
    console.log('👤 Client:', dummyInspectionJson.metadata.client_name);
    console.log('📅 Date:', dummyInspectionJson.audit.created_at);
    
    const reportPath = await generatePdf(dummyInspectionJson);
    
    console.log('\n✅ PDF generated successfully!');
    console.log('📁 File path:', reportPath);
    console.log('🌐 Access at: http://localhost:5000/' + reportPath);
    console.log('\n💡 The PDF filename follows PROPCHK format:');
    console.log('   Home Inspection Report_[Property Address]_[Client Name]_[Date].pdf');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  testPdfGeneration();
}

module.exports = { testPdfGeneration, dummyInspectionJson };

