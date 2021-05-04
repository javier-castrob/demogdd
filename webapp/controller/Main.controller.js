sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "gdd/gdd/util/Services",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/mvc/View",
    'sap/m/MessageToast',
    'sap/m/MessageBox',
],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} Controller
	 */
	function (Controller, Services, JSONModel, Filter, FilterOperator, View, MessageToast, MessageBox) {
        "use strict";

		return Controller.extend("gdd.gdd.controller.Main", {
			onInit: function () {
                this.Dialogs = {}
                this.Dialog;
                this.loadModel();
                let oModel = new JSONModel();
                this.getOwnerComponent().setModel(oModel, "guideModel");
                let oData = {
                    items: []
                }
                oModel = new JSONModel(oData);
                this.getOwnerComponent().setModel(oModel,"palletModel");
                let oInfo = {
                    countItems: 0,
                    countPallets: 0,
                    um: "",
                    weight: 0,
                    totalWeight: 0
                };
                oModel = new JSONModel(oInfo);
                this.getView().setModel(oModel, "Info");
                oData = {
                    pallets: []
                }
                oModel = new JSONModel(oData);
                this.getView().setModel(oModel,"orderModel");

            },
            loadModel: async function(){
                const oResponse = await Services.getLocalJSON("GDD.json");
                const oData = oResponse[0];
                oData.forEach(GD => {
                    GD.detail.forEach(item => {
                        item.selected = false;
                        item.editable = true;
                    });
                });
                var oModel = new JSONModel();
                oModel.setData(oData);                
                this.getOwnerComponent().setModel(oModel, "GD");
            },
            selectGD: function (oEvent){
                let oBindingContext = oEvent.getSource().getSelectedItem().getBindingContext("GD");
                let oModel = this.getOwnerComponent().getModel("GD");
                let oGDSeleccionado = oModel.getProperty(oBindingContext.getPath());
                this.getOwnerComponent().getModel("guideModel").setData(oGDSeleccionado);
                this.validateSelected();
            },
            onSearch: function (oEvent){
                let aFilters = [];
                let sQuery = oEvent.getSource().getValue();
                if (sQuery && sQuery.length > 0) {
                    let filter = new Filter("Proveedor", FilterOperator.Contains, sQuery);
                    aFilters.push(filter)
                    filter = new Filter("Numero_guia", FilterOperator.Contains, sQuery);
                    aFilters.push(filter)
                    filter = new Filter("Fecha", FilterOperator.Contains, sQuery);
                    aFilters.push(filter)
                    aFilters = new Filter(aFilters, false);
                }
                // update list binding
                let oLista = this.byId("idListGD");
                let oBinding = oLista.getBinding("items");
                oBinding.filter(aFilters, "Application");
                // this.getView().getModel(Constants.model.toolsModel).setProperty(Constants.properties.TOOLS_MODEL.cantidad, oLista.getItems().length);
            },

            add: function () {
                let oTable = this.byId("idTableDetailGuide");
                let palletModel = oTable.getSelectedItems();
                let oModel = this.getOwnerComponent().getModel("guideModel");
                let itemsAceptados = [];
                let that = this;
                //Add items to "palletModel"
                palletModel.forEach(item => {
                    if (item.getMultiSelectControl().getEditable()) {
                        let oItem = oModel.getProperty(item.getBindingContext("guideModel").getPath());
                        let count = 0

                        oModel.getData().detail.forEach(detailGuide => {
                            if (oItem == detailGuide){
                                detailGuide.selected = true;
                                detailGuide.editable = false;
                                let path = that.byId("idListGD").getSelectedItem().getBindingContext("GD").getPath();
                                that.getView().getModel("GD").setProperty(path + "/detail/" + count, detailGuide);
                            }
                            count = count + 1;
                        });
                        oItem.deliveryOrders = oModel.getProperty("/Numero_guia");
                        oItem.proveedor = oModel.getProperty("/Proveedor");
                        oItem.fecha = oModel.getProperty("/Fecha");
                        let oItemsModel = that.getView().getModel("palletModel");
                        let oData = oItemsModel.getData();
                        oData.items.push(oItem);
                        oItemsModel.setData(oData);
                        itemsAceptados.push(oItem);
                    }
                });
                //Disable selected items
                oTable.getSelectedItems().forEach(item => {
                    item.getMultiSelectControl().setEditable(false)
                });
                //Disable select all cb
                if (oTable.getItems().length == oTable.getSelectedItems().length) {
                    oTable._getSelectAllCheckbox().setEditable(false)
                }
                //Create msg
                if(itemsAceptados.length > 0){
                    let msgSuccess = + itemsAceptados.length;
                    MessageToast.show(msgSuccess + ' items were added.');
                }
                //Update counter
                let count = itemsAceptados.length
                let sumaCount = this.getView().getModel("Info").getProperty("/countItems") + count;
                this.getView().getModel("Info").setProperty("/countItems", sumaCount);
            },

            delete: function (oEvent) {
                let button = oEvent.getSource();
                let column = this.byId("idColumnAction");
                if (button.getText() == "Enable Delete") {
                    column.setVisible(true)
                    button.setText("Disable Delete")
                } else {
                    column.setVisible(false)
                    button.setText("Enable Delete")
                }
            },

            deleteGD:function (oEvent) {
                let row = oEvent.getSource().getParent();
                let oPalletModel = this.getView().getModel("palletModel");

                //Change selected atribute
                let oGDModel = this.getView().getModel("GD");
                let path = row.getBindingContext("palletModel").getPath();
                let itemDelete = oPalletModel.getProperty(path);
                let nGuide = itemDelete.deliveryOrders;
                let guide = oGDModel.getData().find(guide => guide.Numero_guia == nGuide);
                let item = guide.detail.find(item => item.Item == itemDelete.Item); 
                let indexItem = guide.detail.findIndex(item => item.Item == itemDelete.Item);
                let indexGuide = oGDModel.getData().findIndex(guide => guide.Numero_guia == nGuide)
                oGDModel.setProperty("/"+indexGuide+"/detail/"+indexItem+"/selected",false)
                oGDModel.setProperty("/"+indexGuide+"/detail/"+indexItem+"/editable",true)
                let oTable = this.byId("idTableDetailGuide");
                if (oTable.getItems().length == oTable.getSelectedItems().length) {
                    oTable._getSelectAllCheckbox().setEditable(false)
                } else {
                    oTable._getSelectAllCheckbox().setEditable(true)
                }
                //delete from pallet
                let indice = parseInt(row.getIdForLabel().split("-")[4]);
                let arrayItems = oPalletModel.getData().items;
                arrayItems.splice(indice,1);
                oPalletModel.setProperty("/items", arrayItems);
                //Update counter
                let sumaCount = this.getView().getModel("Info").getProperty("/countItems") - 1;
                this.getView().getModel("Info").setProperty("/countItems", sumaCount);
            },
            unselectGD: function(oEvent) {
                if (oEvent.getParameters().key == "gd") {
                    if (this.byId("idListGD").getSelectedItem() != undefined) {
                        this.byId("idListGD").getSelectedItem().setSelected(false);
                        let oModel = new JSONModel();
                        this.getOwnerComponent().setModel(oModel, "guideModel");
                        let oData = {
                            items: []
                        }
                    }
                }
            },
            validateSelected: function () {
                //revisar error de repetido el primer item
                let oTable = this.byId("idTableDetailGuide");
                oTable.getItems().forEach(item => {
                    let pathItem = item.getBindingContext("guideModel").getPath()
                    let oGuideModel = this.getView().getModel("GD");
                    let pathGD = this.byId("idListGD").getSelectedContextPaths()[0]
                    let editable = oGuideModel.getProperty(pathGD + pathItem + "/editable");
                    if (editable == false) {
                        if (item.getSelected()) {
                            let cb = item.$().find('.sapMCb');
                            let oCb = this.byId(cb.attr('id'));
                            oCb.setEditable(false);
                            // item.getMultiSelectControl().setEditable(false)
                        } else {
                            if (item.getMultiSelectControl() != undefined) {
                                item.getMultiSelectControl().setEditable(true)
                            }
                        }
                    } else {
                        if (item.getMultiSelectControl() != undefined) {
                            item.getMultiSelectControl().setEditable(true)
                        }
                    }
                });
                if (oTable.getSelectedItems().length > 0) {
                    oTable._getSelectAllCheckbox().setEditable(false)
                } else {
                    oTable._getSelectAllCheckbox().setEditable(true)
                }
            },
            createPallet: function () {
                
                this.createDialogs("weight", "idDialogWeight", "gdd.gdd.fragments.weight").open();
            },
            createDialogs: function(sDialogFragmentName, id, route){
                var oDialog;
                //Setear Dialogo
                oDialog = this.Dialogs[sDialogFragmentName];
                //Si NO existe , crea un nuevo dialogo y le asigna la propiedad del dialogo el cual proviene (SORT O GROUP en este caso)
                if(!oDialog){
                    oDialog = sap.ui.xmlfragment(id, route,this);
                    this.getView().addDependent(oDialog);
                    this.Dialogs[sDialogFragmentName] = oDialog; }
                this.Dialog= oDialog;
                return oDialog;
            },
            closeDialog: function() {
                this.Dialog.close()
            },
            saveWeight: function(){
                let detail = this.getOwnerComponent().getModel("palletModel").getProperty("/items");
                let cod = this.getView().getModel("Info").getProperty("/countPallets");
                let newPallet = {
                    codPallet: cod + 1,
                    detail: detail
                };
                let totalWeight =  this.getView().getModel("Info").getProperty("/totalWeight");
                let um = this.getView().getModel("Info").getProperty("/um");
                let weight = parseFloat(this.getView().getModel("Info").getProperty("/weight"));
                if (um == "KG"){
                    weight = weight /1000
                }
                if (totalWeight + weight <= 20) {
                    let aPallets = this.getView().getModel("orderModel").getProperty("/pallets");
                    aPallets.push(newPallet);
                    this.getView().getModel("orderModel").setProperty("/pallets", aPallets);
                    let indice = this.getView().getModel("orderModel").getData().pallets.length - 1;
                    let pallet = this.getView().getModel("orderModel").getProperty("/pallets/" + indice);
                    pallet.weight = this.getView().getModel("Info").getProperty("/weight");
                    pallet.um = this.getView().getModel("Info").getProperty("/um");
                    pallet.countItems = pallet.detail.length;
                    this.getView().getModel("orderModel").setProperty("/pallets/" + indice, pallet);
                    let oData = {
                        items: []
                    }
                    let oModel = new JSONModel(oData);
                    this.getOwnerComponent().setModel(oModel,"palletModel");
                    let tab = this.byId("idIconTabBarMulti");
                    tab.setSelectedKey("order");
                    this.closeDialog()
                    let countPallets = this.getView().getModel("Info").getProperty("/countPallets");
                    this.getView().getModel("Info").setProperty("/countPallets", parseInt(countPallets) + 1 );
                    this.getView().getModel("Info").setProperty("/countItems", 0);
                    this.getView().getModel("Info").setProperty("/totalWeight", totalWeight + weight);
                    this.getView().getModel("Info").setProperty("/weight", 0);
                    this.getView().getModel("Info").setProperty("/um", "");
                } else {
                    MessageBox.error("You have surpassed the limit of 20 TON per Truck. \n" + 
                    "There is : "+ Math.round(((totalWeight+weight) - 20),-3) + " extra TONs");
                }
                
                
            },
            createOrder: function() {

                let that = this;
                MessageBox.confirm("Are you sure that you want to finish this order?", {
					onClose: function (oAction) {
						if (oAction === MessageBox.Action.OK) {
                            // MessageToast.show("Freight Order: " + Math.round(Math.random() * (9999999 - 1) + 1), {duration:2000});
                            MessageBox.success(`Your freight order was created successfully
                            `+`Your number order is: ` + Math.trunc(Math.round(Math.random() * (9999999 - 1) + 1),
                            {title:'Success!'}),
                            {onClose: function (oAction) {
                                let oData = {
                                    pallets: []
                                }
                                let oModel = new JSONModel(oData);
                                that.getView().setModel(oModel,"orderModel");
                                that.getView().getModel("Info").setProperty("/countPallets", 0);
                                let tab = that.byId("idIconTabBarMulti");
                                tab.setSelectedKey("gd");
                            }}
                            );
                            
						}
					}
				}); 
            },
            refresh: function () {
                let tab = this.byId("idIconTabBarMulti");
                if (tab.getSelectedKey() == "order") {
                    tab.setSelectedKey("gd");
                    tab.setSelectedKey("order");
                }
            
            }
    		});
	});
