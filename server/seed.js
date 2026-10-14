require('dotenv').config();
const mongoose = require('mongoose');
const {
  User,
  Category,
  Supplier,
  Product,
  Customer,
  Order,
  PurchaseOrder,
  StockMovement,
  Notification,
} = require('./src/models');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_inventory';

const seedDatabase = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('[Seed] Connected. Clearing existing collections...');

    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Supplier.deleteMany({}),
      Product.deleteMany({}),
      Customer.deleteMany({}),
      Order.deleteMany({}),
      PurchaseOrder.deleteMany({}),
      StockMovement.deleteMany({}),
      Notification.deleteMany({}),
    ]);

    console.log('[Seed] 1. Seeding Users (Admin & Staff)...');
    const adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@smartinventory.com',
      password: 'Admin123!',
      role: 'admin',
      phone: '+1 (555) 019-2834',
      status: 'active',
    });

    const staffUser = await User.create({
      name: 'Elena Rostova',
      email: 'staff@smartinventory.com',
      password: 'Staff123!',
      role: 'staff',
      phone: '+1 (555) 018-9922',
      status: 'active',
    });

    const warehouseStaff = await User.create({
      name: 'Marcus Vance',
      email: 'marcus@smartinventory.com',
      password: 'Staff123!',
      role: 'staff',
      phone: '+1 (555) 017-3344',
      status: 'active',
    });

    console.log('[Seed] 2. Seeding Categories...');
    const categoriesData = [
      { name: 'Electronics & Gadgets', description: 'Computing, mobile accessories, audio, and smart peripherals' },
      { name: 'Office Supplies', description: 'Stationery, paper products, filing supplies, and ergonomic desk gear' },
      { name: 'Commercial Kitchen & Dining', description: 'Cookware, coffee brewing equipment, food prep tools, and cutlery' },
      { name: 'Tools & Workshop', description: 'Hand tools, precision instruments, measuring gear, and power accessories' },
      { name: 'Packaging & Shipping', description: 'Cardboard boxes, thermal labels, bubble mailers, and sealing tapes' },
    ];
    const categories = await Category.insertMany(categoriesData);
    const catMap = categories.reduce((acc, c) => ({ ...acc, [c.name]: c._id }), {});

    console.log('[Seed] 3. Seeding Suppliers...');
    const suppliersData = [
      {
        name: 'Apex Global Logistics & Supplies',
        contactPerson: 'David Chen',
        email: 'dchen@apexlogistics.com',
        phone: '+1 (555) 234-5678',
        address: { street: '1200 Pacific Blvd', city: 'San Jose', state: 'CA', postalCode: '95110', country: 'USA' },
        notes: 'Tier 1 vendor with 14-day net terms. Electronics primary distributor.',
      },
      {
        name: 'OmniCraft Industrial Goods',
        contactPerson: 'Rachel Miller',
        email: 'rmiller@omnicraft.com',
        phone: '+1 (555) 345-6789',
        address: { street: '850 Industrial Pkwy', city: 'Cleveland', state: 'OH', postalCode: '44101', country: 'USA' },
        notes: 'Tooling, heavy hardware, and storage equipment.',
      },
      {
        name: 'Metro Stationery & Paper Co.',
        contactPerson: 'Thomas Wayne',
        email: 'twayne@metrostationery.com',
        phone: '+1 (555) 456-7890',
        address: { street: '45 Gotham Way', city: 'Chicago', state: 'IL', postalCode: '60601', country: 'USA' },
        notes: 'Bulk paper, binders, and shipping supplies supplier.',
      },
      {
        name: 'Artisan Culinary Imports',
        contactPerson: 'Sofia Rossi',
        email: 'srossi@artisanculinary.com',
        phone: '+1 (555) 567-8901',
        address: { street: '310 Mercer St', city: 'New York', state: 'NY', postalCode: '10012', country: 'USA' },
        notes: 'Premium commercial kitchen equipment and barista essentials.',
      },
      {
        name: 'Pacific Pack & Ship Distribution',
        contactPerson: 'Kevin Patel',
        email: 'kpatel@pacificpack.com',
        phone: '+1 (555) 678-9012',
        address: { street: '400 Harbor Blvd', city: 'Seattle', state: 'WA', postalCode: '98101', country: 'USA' },
        notes: 'Corrugated cartons, tamper-evident tape, and eco-friendly dunnage.',
      },
    ];
    const suppliers = await Supplier.insertMany(suppliersData);

    console.log('[Seed] 4. Seeding 35+ Products...');
    const productsData = [
      // Electronics
      { name: 'Ergonomic Wireless Mechanical Keyboard', sku: 'ELEC-KB-001', category: catMap['Electronics & Gadgets'], supplier: suppliers[0]._id, price: 119.99, costPrice: 65.0, quantity: 45, reorderLevel: 10, description: 'Dual-mode Bluetooth & 2.4G wireless keyboard with Gateron switches.' },
      { name: 'Precision Optical Gaming Mouse', sku: 'ELEC-MS-002', category: catMap['Electronics & Gadgets'], supplier: suppliers[0]._id, price: 49.99, costPrice: 22.5, quantity: 38, reorderLevel: 8, description: '16000 DPI sensor with programmable macros.' },
      { name: 'Active Noise Cancelling Bluetooth Headphones', sku: 'ELEC-HP-003', category: catMap['Electronics & Gadgets'], supplier: suppliers[0]._id, price: 159.0, costPrice: 85.0, quantity: 4, reorderLevel: 10, description: 'Over-ear headphones with 40-hour battery life. (Low Stock)' },
      { name: 'Ultra-Slim 4K USB-C Portable Monitor 15.6"', sku: 'ELEC-MN-004', category: catMap['Electronics & Gadgets'], supplier: suppliers[0]._id, price: 249.99, costPrice: 140.0, quantity: 0, reorderLevel: 5, description: 'IPS panel with 100% sRGB color gamut. (Out of Stock)' },
      { name: '100W GaN Fast Charger 4-Port Hub', sku: 'ELEC-CH-005', category: catMap['Electronics & Gadgets'], supplier: suppliers[0]._id, price: 59.99, costPrice: 26.0, quantity: 60, reorderLevel: 15, description: 'Compact fast charger supporting laptop & phone simultaneous charging.' },
      { name: 'Aluminum Laptop Riser Stand with Hub', sku: 'ELEC-ST-006', category: catMap['Electronics & Gadgets'], supplier: suppliers[0]._id, price: 69.99, costPrice: 32.0, quantity: 24, reorderLevel: 8, description: 'Ergonomic ventilated stand with integrated 6-in-1 USB hub.' },
      { name: 'Webcam 1080p 60fps with Ring Light', sku: 'ELEC-WC-007', category: catMap['Electronics & Gadgets'], supplier: suppliers[0]._id, price: 79.99, costPrice: 38.0, quantity: 3, reorderLevel: 10, description: 'Autofocus streaming camera with dual noise-reduction microphones.' },

      // Office Supplies
      { name: 'Heavy-Duty Mesh Ergonomic Task Chair', sku: 'OFF-CH-001', category: catMap['Office Supplies'], supplier: suppliers[2]._id, price: 289.99, costPrice: 155.0, quantity: 18, reorderLevel: 5, description: 'Adjustable lumbar support with 3D armrests and breathable mesh.' },
      { name: 'Electric Motorized Standing Desk Frame', sku: 'OFF-DK-002', category: catMap['Office Supplies'], supplier: suppliers[2]._id, price: 349.0, costPrice: 190.0, quantity: 2, reorderLevel: 5, description: 'Dual motor height adjustable desk frame with memory presets.' },
      { name: 'Premium Hardcover Dotted Journal Notebook', sku: 'OFF-NB-003', category: catMap['Office Supplies'], supplier: suppliers[2]._id, price: 16.5, costPrice: 6.0, quantity: 120, reorderLevel: 25, description: '160gsm archival bleed-resistant ivory paper.' },
      { name: 'Refillable Gel Ink Rollerball Pens (Box of 12)', sku: 'OFF-PN-004', category: catMap['Office Supplies'], supplier: suppliers[2]._id, price: 18.99, costPrice: 7.5, quantity: 85, reorderLevel: 20, description: 'Smooth 0.5mm quick-dry black pigment ink.' },
      { name: 'Magnetic Dry Erase Whiteboard 36"x24"', sku: 'OFF-WB-005', category: catMap['Office Supplies'], supplier: suppliers[2]._id, price: 54.0, costPrice: 24.0, quantity: 14, reorderLevel: 5, description: 'Silver aluminum frame whiteboard with marker tray.' },
      { name: 'Heavy-Duty Electric 3-Hole Paper Punch', sku: 'OFF-PU-006', category: catMap['Office Supplies'], supplier: suppliers[2]._id, price: 89.0, costPrice: 42.0, quantity: 8, reorderLevel: 4, description: 'Punches up to 30 sheets per press with auto clear sensor.' },
      { name: 'Desktop Acoustic Privacy Partition Screen', sku: 'OFF-SC-007', category: catMap['Office Supplies'], supplier: suppliers[2]._id, price: 75.0, costPrice: 35.0, quantity: 20, reorderLevel: 5, description: 'Sound dampening felt desk divider with clamp mounts.' },

      // Kitchen & Dining
      { name: 'Commercial Precision Espresso Machine 15-Bar', sku: 'KIT-ES-001', category: catMap['Commercial Kitchen & Dining'], supplier: suppliers[3]._id, price: 599.99, costPrice: 320.0, quantity: 6, reorderLevel: 3, description: 'PID dual temperature control with commercial stainless steam wand.' },
      { name: 'Conical Burr Electric Coffee Grinder', sku: 'KIT-GR-002', category: catMap['Commercial Kitchen & Dining'], supplier: suppliers[3]._id, price: 149.99, costPrice: 78.0, quantity: 1, reorderLevel: 5, description: '40 precision grind settings with anti-static chute. (Low Stock)' },
      { name: 'Cast Iron Enamelled Dutch Oven 6-Quart', sku: 'KIT-DO-003', category: catMap['Commercial Kitchen & Dining'], supplier: suppliers[3]._id, price: 89.99, costPrice: 42.0, quantity: 28, reorderLevel: 8, description: 'Heavy-duty porcelain enameled interior with self-basting lid.' },
      { name: 'Japanese Damascus Chef Knife 8-Inch', sku: 'KIT-KN-004', category: catMap['Commercial Kitchen & Dining'], supplier: suppliers[3]._id, price: 129.0, costPrice: 58.0, quantity: 15, reorderLevel: 6, description: '67-layer VG-10 core steel with G10 ergonomic handle.' },
      { name: 'Sous Vide Precision Immersion Cooker 1200W', sku: 'KIT-SV-005', category: catMap['Commercial Kitchen & Dining'], supplier: suppliers[3]._id, price: 119.5, costPrice: 59.0, quantity: 22, reorderLevel: 6, description: 'WiFi-enabled water circulator accurate to 0.1°F.' },
      { name: 'Digital Commercial Kitchen Food Scale 33lb', sku: 'KIT-SC-006', category: catMap['Commercial Kitchen & Dining'], supplier: suppliers[3]._id, price: 34.99, costPrice: 14.5, quantity: 50, reorderLevel: 12, description: 'Tempered glass splash-proof digital kitchen scale.' },
      { name: 'Stainless Steel Mixing Bowls Set of 5', sku: 'KIT-BW-007', category: catMap['Commercial Kitchen & Dining'], supplier: suppliers[3]._id, price: 39.99, costPrice: 18.0, quantity: 40, reorderLevel: 10, description: 'Nesting stainless prep bowls with airtight silicone lids.' },

      // Tools & Workshop
      { name: '20V Cordless Brushless Drill & Driver Kit', sku: 'TLS-DR-001', category: catMap['Tools & Workshop'], supplier: suppliers[1]._id, price: 179.99, costPrice: 95.0, quantity: 16, reorderLevel: 6, description: '2-speed gearbox with two 2.0Ah lithium-ion batteries and charger.' },
      { name: 'Digital Vernier Caliper Stainless 6-Inch', sku: 'TLS-CL-002', category: catMap['Tools & Workshop'], supplier: suppliers[1]._id, price: 29.99, costPrice: 12.0, quantity: 35, reorderLevel: 10, description: 'Metric & Imperial conversion accurate to 0.0005 inch.' },
      { name: 'Professional Mechanics Socket Tool Set 120pc', sku: 'TLS-SK-003', category: catMap['Tools & Workshop'], supplier: suppliers[1]._id, price: 145.0, costPrice: 75.0, quantity: 0, reorderLevel: 5, description: 'Chrome vanadium alloy with 72-tooth quick-release ratchets. (Out of Stock)' },
      { name: 'Infrared Laser Thermometer Gun -58°F to 1022°F', sku: 'TLS-TH-004', category: catMap['Tools & Workshop'], supplier: suppliers[1]._id, price: 39.5, costPrice: 16.0, quantity: 42, reorderLevel: 10, description: 'Non-contact surface temperature reader with backlit LCD.' },
      { name: 'Heavy Duty Bench Vise with Swivel Base 6"', sku: 'TLS-VS-005', category: catMap['Tools & Workshop'], supplier: suppliers[1]._id, price: 119.0, costPrice: 62.0, quantity: 11, reorderLevel: 4, description: '60,000 PSI ductile iron casting with integrated pipe jaws.' },
      { name: 'Automatic Wire Stripper & Crimping Tool', sku: 'TLS-WS-006', category: catMap['Tools & Workshop'], supplier: suppliers[1]._id, price: 24.99, costPrice: 9.5, quantity: 65, reorderLevel: 15, description: 'Self-adjusting jaw strips wire from 10-24 AWG effortlessly.' },
      { name: 'Magnetic LED Work Light Rechargeable 1500lm', sku: 'TLS-LT-007', category: catMap['Tools & Workshop'], supplier: suppliers[1]._id, price: 32.99, costPrice: 13.0, quantity: 30, reorderLevel: 8, description: 'Rotatable inspection lamp with magnet base and hanging hook.' },

      // Packaging & Shipping
      { name: 'Heavy-Duty Corrugated Cartons 16"x12"x12" (Pack of 25)', sku: 'PKG-BX-001', category: catMap['Packaging & Shipping'], supplier: suppliers[4]._id, price: 42.5, costPrice: 19.0, quantity: 80, reorderLevel: 20, description: 'ECT-32 single wall kraft shipping cartons.' },
      { name: 'Industrial Packing Tape 2"x110yd (Pack of 6)', sku: 'PKG-TP-002', category: catMap['Packaging & Shipping'], supplier: suppliers[4]._id, price: 21.99, costPrice: 8.5, quantity: 150, reorderLevel: 30, description: '2.4 mil acrylic carton sealing tape.' },
      { name: 'Biodegradable Air Pillow Cushions (Roll of 1000)', sku: 'PKG-PL-003', category: catMap['Packaging & Shipping'], supplier: suppliers[4]._id, price: 48.0, costPrice: 20.0, quantity: 45, reorderLevel: 10, description: 'Compostable air cushions for void fill and drop impact absorption.' },
      { name: 'Thermal Direct Shipping Labels 4"x6" (Roll of 500)', sku: 'PKG-LB-004', category: catMap['Packaging & Shipping'], supplier: suppliers[4]._id, price: 14.99, costPrice: 5.2, quantity: 200, reorderLevel: 40, description: 'Perforated thermal transfer labels compatible with Zebra and Rollo.' },
      { name: 'Hand Stretch Wrap Film 18"x1500ft 80-Gauge', sku: 'PKG-ST-005', category: catMap['Packaging & Shipping'], supplier: suppliers[4]._id, price: 26.5, costPrice: 11.0, quantity: 70, reorderLevel: 15, description: 'Cast puncture-resistant pallet shrink wrap.' },
      { name: 'Bubble Cushioning Wrap 12"x175ft Perforated', sku: 'PKG-BW-006', category: catMap['Packaging & Shipping'], supplier: suppliers[4]._id, price: 28.0, costPrice: 12.0, quantity: 5, reorderLevel: 15, description: 'Air bubble wrap with cross perforations every 12 inches. (Low Stock)' },
      { name: 'Kraft Honeycomb Padded Paper Mailers #2 (Box of 50)', sku: 'PKG-ML-007', category: catMap['Packaging & Shipping'], supplier: suppliers[4]._id, price: 34.0, costPrice: 15.0, quantity: 60, reorderLevel: 15, description: '100% recyclable paper cushioned protective envelopes.' },
    ];

    const products = await Product.insertMany(productsData);

    console.log('[Seed] 5. Seeding 10 Customers...');
    const customersData = [
      { name: 'Meridian Retail Partners', email: 'procurement@meridianretail.com', phone: '+1 (555) 789-0123', address: { street: '500 Market St #10', city: 'San Francisco', state: 'CA', postalCode: '94105' } },
      { name: 'Oakridge Specialty Stores', email: 'buyer@oakridgestores.com', phone: '+1 (555) 890-1234', address: { street: '1440 Broadway Ave', city: 'Oakland', state: 'CA', postalCode: '94612' } },
      { name: 'Blue Horizon Tech Hub', email: 'orders@bluehorizontech.io', phone: '+1 (555) 901-2345', address: { street: '720 2nd Ave S', city: 'Seattle', state: 'WA', postalCode: '98104' } },
      { name: 'Cascade Craft Coffee Roasters', email: 'supply@cascadecoffee.com', phone: '+1 (555) 012-3456', address: { street: '915 SE Division St', city: 'Portland', state: 'OR', postalCode: '97202' } },
      { name: 'Summit Pro Contractors', email: 'tools@summitcontractors.com', phone: '+1 (555) 123-4560', address: { street: '2100 Welton St', city: 'Denver', state: 'CO', postalCode: '80205' } },
      { name: 'Nexus Logistics Depot', email: 'warehouse@nexusdepot.com', phone: '+1 (555) 234-5671', address: { street: '3400 Airport Fwy', city: 'Dallas', state: 'TX', postalCode: '75261' } },
      { name: 'Apex Design & Co-working Studios', email: 'facilities@apexstudios.com', phone: '+1 (555) 345-6782', address: { street: '100 Congress Ave', city: 'Austin', state: 'TX', postalCode: '78701' } },
      { name: 'Vanguard Culinary Academy', email: 'pantry@vanguardculinary.edu', phone: '+1 (555) 456-7893', address: { street: '250 Boylston St', city: 'Boston', state: 'MA', postalCode: '02116' } },
      { name: 'Liberty Hardware & Supply Co.', email: 'orders@libertyhardware.com', phone: '+1 (555) 567-8904', address: { street: '410 Arch St', city: 'Philadelphia', state: 'PA', postalCode: '19106' } },
      { name: 'Pioneer Office Express', email: 'accts@pioneeroffice.com', phone: '+1 (555) 678-9015', address: { street: '800 Brickell Ave', city: 'Miami', state: 'FL', postalCode: '33131' } },
    ];
    const customers = await Customer.insertMany(customersData);

    console.log('[Seed] 6. Seeding 45+ Orders spread over recent 6 months for realistic charts...');
    const now = Date.now();
    const sixMonthsAgo = now - 180 * 24 * 60 * 60 * 1000;

    const statuses = ['delivered', 'delivered', 'delivered', 'shipped', 'packed', 'confirmed', 'pending', 'cancelled'];
    const paymentMethods = ['card', 'card', 'bank_transfer', 'cash', 'online'];
    const paymentStatuses = ['paid', 'paid', 'paid', 'paid', 'pending'];

    const ordersToInsert = [];
    const stockMovementsToInsert = [];

    let orderCounter = 1001;

    for (let i = 0; i < 48; i++) {
      // Random date between 6 months ago and today
      const orderTimestamp = new Date(sixMonthsAgo + Math.random() * (now - sixMonthsAgo));
      const customer = customers[i % customers.length];
      const status = statuses[i % statuses.length];
      const paymentMethod = paymentMethods[i % paymentMethods.length];
      const paymentStatus = status === 'delivered' || status === 'shipped' || status === 'confirmed' ? 'paid' : paymentStatuses[i % paymentStatuses.length];

      // Pick 1 to 4 random products
      const numItems = 1 + Math.floor(Math.random() * 3);
      const items = [];
      let subtotal = 0;

      for (let j = 0; j < numItems; j++) {
        const product = products[(i * 3 + j) % products.length];
        const qty = 1 + Math.floor(Math.random() * 4);
        const itemSubtotal = parseFloat((product.price * qty).toFixed(2));
        subtotal += itemSubtotal;

        items.push({
          product: product._id,
          name: product.name,
          sku: product.sku,
          quantity: qty,
          price: product.price,
          subtotal: itemSubtotal,
        });

        // If order was confirmed/shipped/delivered, record stock deduction movement
        if (['confirmed', 'packed', 'shipped', 'delivered'].includes(status)) {
          stockMovementsToInsert.push({
            product: product._id,
            type: 'out',
            quantity: qty,
            previousQuantity: product.quantity + qty,
            newQuantity: product.quantity,
            reason: 'order_confirmed',
            referenceType: 'Order',
            performedBy: adminUser._id,
            notes: `Fulfillment deduction for ORD-2026-${orderCounter}`,
            createdAt: orderTimestamp,
          });
        }
      }

      subtotal = parseFloat(subtotal.toFixed(2));
      const discount = i % 5 === 0 ? 15 : 0;
      const taxRate = 0.1;
      const taxAmount = parseFloat((subtotal * taxRate).toFixed(2));
      const shippingCost = subtotal > 150 ? 0 : 9.99;
      const total = parseFloat((subtotal + taxAmount + shippingCost - discount).toFixed(2));

      const isStockDeducted = ['confirmed', 'packed', 'shipped', 'delivered'].includes(status);

      ordersToInsert.push({
        orderNumber: `ORD-2026-${orderCounter}`,
        customer: customer._id,
        items,
        subtotal,
        taxRate,
        taxAmount,
        discount,
        shippingCost,
        total,
        paymentStatus,
        paymentMethod,
        orderStatus: status,
        stockDeducted: isStockDeducted,
        shippingAddress: customer.address,
        notes: i % 4 === 0 ? 'Expedited ground freight requested.' : '',
        createdBy: adminUser._id,
        statusHistory: [
          { status: 'pending', changedBy: adminUser._id, timestamp: orderTimestamp, note: 'Order created' },
          ...(isStockDeducted ? [{ status: 'confirmed', changedBy: staffUser._id, timestamp: new Date(orderTimestamp.getTime() + 3600000), note: 'Stock reserved & payment verified' }] : []),
          ...(status === 'delivered' ? [{ status: 'delivered', changedBy: staffUser._id, timestamp: new Date(orderTimestamp.getTime() + 86400000), note: 'Delivered and signed by recipient' }] : []),
        ],
        createdAt: orderTimestamp,
        updatedAt: orderTimestamp,
      });

      // Update customer running totals
      customer.totalOrders += 1;
      customer.totalSpent += total;

      orderCounter++;
    }

    await Order.insertMany(ordersToInsert);
    await StockMovement.insertMany(stockMovementsToInsert);

    // Save updated customer order totals
    for (const cust of customers) {
      await cust.save();
    }

    console.log('[Seed] 7. Seeding Purchase Orders & Intake Movements...');
    const po1 = await PurchaseOrder.create({
      poNumber: 'PO-2026-9001',
      supplier: suppliers[0]._id,
      items: [
        { product: products[0]._id, quantity: 20, unitCost: products[0].costPrice, totalCost: 20 * products[0].costPrice },
        { product: products[1]._id, quantity: 15, unitCost: products[1].costPrice, totalCost: 15 * products[1].costPrice },
      ],
      totalAmount: 20 * products[0].costPrice + 15 * products[1].costPrice,
      status: 'received',
      receivedDate: new Date(now - 14 * 24 * 60 * 60 * 1000),
      createdBy: adminUser._id,
      receivedBy: staffUser._id,
      notes: 'Monthly replenishment order for wireless peripherals',
      createdAt: new Date(now - 20 * 24 * 60 * 60 * 1000),
    });

    const po2 = await PurchaseOrder.create({
      poNumber: 'PO-2026-9002',
      supplier: suppliers[3]._id,
      items: [
        { product: products[14]._id, quantity: 10, unitCost: products[14].costPrice, totalCost: 10 * products[14].costPrice },
      ],
      totalAmount: 10 * products[14].costPrice,
      status: 'ordered',
      expectedDeliveryDate: new Date(now + 5 * 24 * 60 * 60 * 1000),
      createdBy: staffUser._id,
      notes: 'Urgent restock for espresso equipment',
      createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
    });

    console.log('[Seed] 8. Seeding System & Low Stock Notifications...');
    await Notification.insertMany([
      {
        title: 'Critical Out of Stock: Ultra-Slim 4K Monitor',
        message: 'Product "Ultra-Slim 4K USB-C Portable Monitor 15.6"" (SKU: ELEC-MN-004) reached 0 units on hand.',
        type: 'out_of_stock',
        severity: 'critical',
        targetRole: 'all',
        isRead: false,
        createdAt: new Date(now - 30 * 60 * 1000),
      },
      {
        title: 'Low Stock Threshold Warning: Electric Coffee Grinder',
        message: 'Product "Conical Burr Electric Coffee Grinder" (SKU: KIT-GR-002) is down to 1 unit (reorder level: 5).',
        type: 'low_stock',
        severity: 'warning',
        targetRole: 'all',
        isRead: false,
        createdAt: new Date(now - 120 * 60 * 1000),
      },
      {
        title: 'Purchase Order Received: PO-2026-9001',
        message: 'Shipment received from Apex Global Logistics. 35 units intake completed.',
        type: 'po_received',
        severity: 'success',
        targetRole: 'all',
        isRead: true,
        createdAt: new Date(now - 14 * 24 * 60 * 60 * 1000),
      },
    ]);

    console.log('\n======================================================');
    console.log(' Demo Data Seeded Successfully!');
    console.log('======================================================');
    console.log(' Admin Credentials:');
    console.log('   Email:    admin@smartinventory.com');
    console.log('   Password: Admin123!');
    console.log(' Staff Credentials:');
    console.log('   Email:    staff@smartinventory.com');
    console.log('   Password: Staff123!');
    console.log(' Seeded Entities:');
    console.log(`   - ${products.length} Products across 5 Categories`);
    console.log(`   - ${suppliers.length} Suppliers`);
    console.log(`   - ${customers.length} Customers`);
    console.log(`   - ${ordersToInsert.length} Orders (Spread over 6 months)`);
    console.log(`   - ${stockMovementsToInsert.length} Stock Movement audit logs`);
    console.log('======================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('[Seed Error] Failed to seed database:', error);
    process.exit(1);
  }
};

seedDatabase();
