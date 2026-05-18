const fs = require('fs/promises');
const path = require('path');
const AdmZip = require('adm-zip');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');

const Order = require('../models/orderModel');
const TransferOrder = require('../models/transferOrderModel');
const Warehouse = require('../models/warehouseModel');

const BACKEND_ROOT = path.resolve(__dirname, '..');
const TEMPLATE_PATH = path.join(BACKEND_ROOT, 'templates', 'Packing_List_Template.docx');
const STORAGE_ROOT = path.join(BACKEND_ROOT, 'storage');
const DOCUMENT_ROOT = path.join(STORAGE_ROOT, 'packing-lists');
const COMPANY = {
    name: 'Lumiere Corporation',
    address: 'Natalio B. Bacalso Ave, Bulacao Pardo, Cebu City, 6000 Cebu',
    contactNumber: '09705157399',
    email: 'earljustinesierra@gmail.com',
};

const ensureDir = async (dirPath) => {
    await fs.mkdir(dirPath, { recursive: true });
};

const formatDate = (value) => {
    const date = value ? new Date(value) : new Date();
    return date.toLocaleDateString('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
};

const getElementChildren = (node, localName) =>
    Array.from(node.childNodes || []).filter(
        (child) => child.nodeType === 1 && (!localName || child.localName === localName)
    );

const getTableRows = (tableNode) => getElementChildren(tableNode, 'tr');
const getTableCells = (rowNode) => getElementChildren(rowNode, 'tc');

const removeNode = (node) => {
    if (node?.parentNode) {
        node.parentNode.removeChild(node);
    }
};

const getParagraphText = (paragraphNode) => Array.from(paragraphNode.getElementsByTagName('w:t') || [])
    .map((node) => node.textContent || '')
    .join('');

const setCellText = (cellNode, text) => {
    const textNodes = Array.from(cellNode.getElementsByTagName('w:t') || []);
    if (textNodes.length === 0) {
        return;
    }

    textNodes[0].textContent = String(text || '');
    for (let index = 1; index < textNodes.length; index += 1) {
        textNodes[index].textContent = '';
    }
};

const replacePlaceholdersInNode = (node, replacements) => {
    const textNodes = Array.from(node.getElementsByTagName('w:t') || []);
    textNodes.forEach((textNode) => {
        let nextValue = textNode.textContent || '';
        Object.entries(replacements).forEach(([placeholder, value]) => {
            nextValue = nextValue.split(placeholder).join(String(value ?? ''));
        });
        textNode.textContent = nextValue;
    });
};

const buildPackingListNumber = (order) => {
    const createdAt = new Date(order.createdAt || Date.now());
    const year = createdAt.getFullYear();
    const suffix = String(order._id || '').slice(-6).toUpperCase();
    return `PL-${year}-${suffix}`;
};

const buildPackingListPayload = async (orderId) => {
    const order = await Order.findById(orderId).populate('product').lean();
    if (!order) {
        throw new Error('Order not found for packing list generation.');
    }

    if (order.orderType !== 'Outbound') {
        throw new Error('Packing lists are only available for customer sales.');
    }

    const warehouse = await Warehouse.findOne({ name: order.warehouse }).lean();
    const product = order.product || {};
    const quantity = Number(order.quantity || 0);
    const packingListNo = buildPackingListNumber(order);
    const lineItems = [
        {
            itemNumber: '1',
            description: product.name || 'Product',
            quantity: String(quantity),
            unit: product.unitOfMeasure || 'unit',
            weight: '',
            remarks: `Customer sale from ${order.warehouse || 'warehouse'}`,
        },
    ];

    return {
        order,
        packingListNo,
        fileName: `${packingListNo}.docx`,
        replacements: {
            '{{PACKING_LIST_NO}}': packingListNo,
            '{{DATE_ISSUED}}': formatDate(new Date()),
            '{{DELIVERY_REFERENCE_NO}}': String(order._id || ''),
            '{{EXPECTED_DELIVERY_DATE}}': formatDate(order.updatedAt || order.createdAt),
            '{{WAREHOUSE_NAME}}': warehouse?.name || order.warehouse || '',
            '{{WAREHOUSE_ADDRESS}}': warehouse?.address || '',
            '{{RECEIVER_NAME}}': 'Customer',
            '{{DELIVERY_ADDRESS}}': 'Customer delivery destination',
            '{{TOTAL_PACKAGES}}': String(lineItems.length),
            '{{TOTAL_WEIGHT}}': '',
            '{{PREPARED_BY}}': '',
            '{{CHECKED_BY}}': '',
            '{{PREPARED_BY_NAME}}': '',
            '{{RECEIVED_BY_NAME}}': '',
        },
        lineItems,
    };
};

const buildTransferPackingListPayload = async (orderId) => {
    const order = await Order.findById(orderId).populate('product').lean();
    if (!order) {
        throw new Error('Order not found for packing list generation.');
    }

    if (order.orderType !== 'Transfer') {
        throw new Error('Packing lists are only available for stock transfers.');
    }

    const transferOrder = await TransferOrder.findOne({ order: order._id }).lean();
    if (!transferOrder) {
        throw new Error('Stock transfer document not found for packing list generation.');
    }

    const [sourceWarehouse, requestingWarehouse] = await Promise.all([
        Warehouse.findOne({ name: order.sourceWarehouse }).lean(),
        Warehouse.findOne({ name: order.warehouse }).lean(),
    ]);
    const product = order.product || {};
    const quantity = Number(order.quantity || 0);
    const packingListNo = `PL-${transferOrder.transferNumber}`;
    const lineItems = [
        {
            itemNumber: '1',
            description: product.name || 'Product',
            quantity: String(quantity),
            unit: product.unitOfMeasure || 'unit',
            weight: '',
            remarks: `Stock transfer to ${requestingWarehouse?.name || order.warehouse || 'warehouse'}`,
        },
    ];

    return {
        fileName: `${packingListNo}.docx`,
        replacements: {
            '{{PACKING_LIST_NO}}': packingListNo,
            '{{DATE_ISSUED}}': formatDate(new Date()),
            '{{DELIVERY_REFERENCE_NO}}': transferOrder.transferNumber,
            '{{EXPECTED_DELIVERY_DATE}}': formatDate(transferOrder.requiredTransferDate || order.createdAt),
            '{{WAREHOUSE_NAME}}': sourceWarehouse?.name || order.sourceWarehouse || '',
            '{{WAREHOUSE_ADDRESS}}': sourceWarehouse?.address || '',
            '{{RECEIVER_NAME}}': requestingWarehouse?.name || order.warehouse || 'Requesting Warehouse',
            '{{DELIVERY_ADDRESS}}': requestingWarehouse?.address || '',
        },
        lineItems,
    };
};

const populatePackingListDocument = (payload, outputPath) => {
    const zip = new AdmZip(TEMPLATE_PATH);
    const parser = new DOMParser();
    const serializer = new XMLSerializer();
    const documentDom = parser.parseFromString(zip.readAsText('word/document.xml'), 'text/xml');
    const body = getElementChildren(documentDom.documentElement, 'body')[0];
    const tables = getElementChildren(body, 'tbl');
    const paragraphs = getElementChildren(body, 'p');

    replacePlaceholdersInNode(documentDom.documentElement, {
        '{{WAREHOUSE_NAME}}': payload.replacements['{{WAREHOUSE_NAME}}'],
        '{{WAREHOUSE_ADDRESS}}': payload.replacements['{{WAREHOUSE_ADDRESS}}'],
        '{{PACKING_LIST_NO}}': payload.replacements['{{PACKING_LIST_NO}}'],
        '{{DATE_ISSUED}}': payload.replacements['{{DATE_ISSUED}}'],
        '{{DELIVERY_REFERENCE_NO}}': payload.replacements['{{DELIVERY_REFERENCE_NO}}'],
        '{{EXPECTED_DELIVERY_DATE}}': payload.replacements['{{EXPECTED_DELIVERY_DATE}}'],
        '{{RECEIVER_NAME}}': payload.replacements['{{RECEIVER_NAME}}'],
        '{{DELIVERY_ADDRESS}}': payload.replacements['{{DELIVERY_ADDRESS}}'],
        '{{TOTAL_PACKAGES}}': String(payload.lineItems.length),
        '{{TOTAL_WEIGHT}}': '',
        'Company Name: Lumiere Corporation': `Company Name: ${COMPANY.name}`,
        'Company Address: Natalio B. Bacalso Ave, Bulacao Pardo, Cebu City, 6000 Cebu': `Company Address: ${COMPANY.address}`,
        'Contact Number: 09705157399': `Contact Number: ${COMPANY.contactNumber}`,
        'Email Address: earljustinesierra@gmail.com': `Email Address: ${COMPANY.email}`,
    });

    const itemsTable = tables[3];
    const itemRows = getTableRows(itemsTable);
    const templateRows = itemRows.slice(1);

    templateRows.forEach((rowNode, index) => {
        const item = payload.lineItems[index];
        if (!item) {
            removeNode(rowNode);
            return;
        }

        const cells = getTableCells(rowNode);
        setCellText(cells[0], item.itemNumber);
        setCellText(cells[1], item.description);
        setCellText(cells[2], item.quantity);
        setCellText(cells[3], item.unit);
        setCellText(cells[4], item.weight);
        setCellText(cells[5], item.remarks);
    });

    const packageSummaryHeading = paragraphs.find((paragraph) => getParagraphText(paragraph).includes('PACKAGE SUMMARY'));
    const summaryTable = tables[4];
    removeNode(packageSummaryHeading);
    removeNode(summaryTable);

    const declarationHeading = paragraphs.find((paragraph) => getParagraphText(paragraph).includes('DECLARATION'));
    const declarationText = paragraphs.find((paragraph) => getParagraphText(paragraph).includes('I hereby certify that the above information is true and correct'));
    const declarationSpacer = declarationText?.nextSibling?.nodeType === 1 && declarationText.nextSibling.localName === 'p'
        ? declarationText.nextSibling
        : null;
    const declarationTable = tables[5];

    removeNode(declarationHeading);
    removeNode(declarationText);
    removeNode(declarationSpacer);
    removeNode(declarationTable);

    zip.updateFile('word/document.xml', Buffer.from(serializer.serializeToString(documentDom), 'utf-8'));
    zip.writeZip(outputPath);
};

const renderPackingListDocument = async (orderId) => {
    await ensureDir(DOCUMENT_ROOT);

    const payload = await buildPackingListPayload(orderId);
    const outputPath = path.join(DOCUMENT_ROOT, payload.fileName);
    populatePackingListDocument(payload, outputPath);

    return {
        outputPath,
        fileName: payload.fileName,
    };
};

const renderTransferPackingListDocument = async (orderId) => {
    await ensureDir(DOCUMENT_ROOT);

    const payload = await buildTransferPackingListPayload(orderId);
    const outputPath = path.join(DOCUMENT_ROOT, payload.fileName);
    populatePackingListDocument(payload, outputPath);

    return {
        outputPath,
        fileName: payload.fileName,
    };
};

module.exports = {
    renderPackingListDocument,
    renderTransferPackingListDocument,
};
