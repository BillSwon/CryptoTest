console.log("Hello", cadesplugin.CAPICOM_CURRENT_USER_STORE)

// cadesplugin.async_spawn(function* (args) {
//     var oAbout = yield cadesplugin.CreateObjectAsync("CAdESCOM.About");
// })

var global_selectbox_counter = 0;

var global_selectbox_container = new Array();
var global_selectbox_container_thumbprint = new Array();

const escapeHtml = (unsafe) => {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


const getVersionPropgramm = ()=> {
    return new Promise(function (resolve, reject) {
        cadesplugin.async_spawn(function* (args) {
            try {
                var versionStruct = {csp: null, os: null, plugin: null, uuid: null};
                var oAbout = yield cadesplugin.CreateObjectAsync("CAdESCOM.About");
                var CurrentPluginVersion = yield oAbout.PluginVersion;
                versionStruct.plugin = yield CurrentPluginVersion.toString();
                document.getElementById('PlugInVersionTxt').innerHTML = escapeHtml("Версия плагина: " + (versionStruct.plugin));
                var ver = yield oAbout.CSPVersion("", 80);
                versionStruct.csp = (yield ver.MajorVersion) + "." + (yield ver.MinorVersion) + "." + (yield ver.BuildVersion);
                document.getElementById('CSPVersionTxt').innerHTML = escapeHtml("Версия криптопровайдера: " + versionStruct.csp);
                try {
                    var sCSPName = yield oAbout.CSPName(80);
                    document.getElementById('CSPNameTxt').innerHTML = escapeHtml("Криптопровайдер: " + sCSPName);
                } catch (err) { }

                try {
                    var oLicense = yield cadesplugin.CreateObjectAsync("CAdESCOM.CPLicense");
                    var cspValidTo = escapeHtml(yield oLicense.ValidTo());
                    var tspValidTo = escapeHtml(yield oLicense.ValidTo(cadesplugin.CADESCOM_PRODUCT_TSP));
                    var ocspValidTo = escapeHtml(yield oLicense.ValidTo(cadesplugin.CADESCOM_PRODUCT_OCSP));
                    cspValidTo += "<br/>\tДата первой установки: " +
                        (yield oLicense.FirstInstallDate(cadesplugin.CADESCOM_PRODUCT_CSP));
                    cspValidTo += "<br/>\tТип лицензии: " +
                        (yield oLicense.Type(cadesplugin.CADESCOM_PRODUCT_CSP));
                    tspValidTo += "<br/>\tДата первой установки: " +
                        (yield oLicense.FirstInstallDate(cadesplugin.CADESCOM_PRODUCT_TSP));
                    tspValidTo += "<br/>\tТип лицензии: " +
                        (yield oLicense.Type(cadesplugin.CADESCOM_PRODUCT_TSP));
                    ocspValidTo += "<br/>\tДата первой установки: " +
                        (yield oLicense.FirstInstallDate(cadesplugin.CADESCOM_PRODUCT_OCSP));
                    ocspValidTo += "<br/>\tТип лицензии: " +
                        (yield oLicense.Type(cadesplugin.CADESCOM_PRODUCT_OCSP));
                    
                    document.getElementById('CspLicense').innerHTML = "Лицензия CSP: " + cspValidTo;
                    if (bShowTspLicenseInfo) {
                        document.getElementById('TspLicense').innerHTML = "Лицензия TSP: " + tspValidTo;
                    }
                    if (bShowOcspLicenseInfo) {
                        document.getElementById('OcspLicense').innerHTML = "Лицензия OCSP: " + ocspValidTo;
                    }    


                } catch (err) { }
            } catch (err) {
                alert(cadesplugin.getLastError(err));
            } finally {
                document.getElementById('infoPlugin').style.display = 'block'
            }
        }, resolve, reject);
    });
}
 
const Print2Digit = (digit) => {
    return (digit<10) ? "0"+digit : digit;
}

const getFormatDate = (paramDate) =>  {
    var certDate = new Date(paramDate);
    return Print2Digit(certDate.getUTCDate())+"."+Print2Digit(certDate.getUTCMonth()+1)+"."+certDate.getFullYear() + " " +
             Print2Digit(certDate.getUTCHours()) + ":" + Print2Digit(certDate.getUTCMinutes()) + ":" + Print2Digit(certDate.getUTCSeconds());
}

const getCerts = () => {
    console.log("getCertificat")
    return new Promise(function (resolve, reject) {
        cadesplugin.async_spawn(function* (args) {
            try {
                var oStore = yield cadesplugin.CreateObjectAsync("CAdESCOM.Store");
                if (!oStore) {
                    alert("Create store failed");
                    return;
                }
                yield oStore.Open()
                var certs = yield oStore.Certificates;
                var certCnt = yield certs.Count;
                 var lst = document.getElementById("listCert");
                 if (certCnt> 0) {
                    document.getElementById('blockStrForSign').style.display = 'block' 
                 }       
                 for (var i = 1; i <= certCnt; i++) {
                    var cert = yield certs.Item(i);
                    var certThumbprint = yield cert.Thumbprint;
                    var ValidFromDate = new Date((yield cert.ValidFromDate));
                    var oOpt = document.createElement("OPTION");
                    var name = yield cert.SubjectName
                    oOpt.text = name + " / Выдан: "+ getFormatDate(ValidFromDate)
                    oOpt.value = global_selectbox_counter;
                    lst.options.add(oOpt);
                    global_selectbox_container.push(cert);
                    global_selectbox_container_thumbprint.push(certThumbprint);
                 }

                 yield oStore.Close();
                 document.getElementById('certInfo').style.display = 'block' 
            } catch (err) {
                alert(cadesplugin.getLastError(err));
            } finally {
                document.getElementById('preloader').style.display = 'none'
            }
        }, resolve, reject);
    });
}


const alertInfo = (certificate) => {
    cadesplugin.async_spawn (function*(args) {
        const SubjectName = yield certificate.SubjectName 
        const IssuerName = yield certificate.IssuerName 
        const ValidToDate = yield certificate.ValidToDate 
        const ValidFromDate = yield certificate.ValidFromDate 
        const HasPrivateKey = yield certificate.HasPrivateKey()
        var Now = new Date();
        var pubKey = yield certificate.PublicKey();
        var algo = yield pubKey.Algorithm;
        var fAlgoName = yield algo.FriendlyName;
        
        var certIsValid = false;

        var Validator = yield certificate.IsValid();
            certIsValid = yield Validator.Result;

        let rezStr = `Владелец: ${SubjectName}; 
                     \nИздатель: ${IssuerName};
                     \nВыдан: ${getFormatDate(ValidFromDate)}; 
                     \nДействителен до: ${getFormatDate(ValidToDate)};  
                     \nСтатус: ${certIsValid?'Валидный':'Невалидный'}; `

        alert(rezStr)
    })
}


const onClicHandlerGetInfoCert = (e) => {
    e.preventDefault()
    var lst = document.getElementById("listCert");
    cadesplugin.async_spawn(function *(args) {
        var certificate = global_selectbox_container[lst.value];
        alertInfo(certificate)
    }, e.target)
}

let signetData = ""

const onClickHandlerSignStr = (e) => {
     document.getElementById('preloader').style.display = 'block'
    e.preventDefault()
    cadesplugin.async_spawn(function*(arg) {
        var dataToSign = document.getElementById("strForSign").value;
        var lst = document.getElementById("listCert");
        var cert = global_selectbox_container[lst.value];
        var oSigner = yield cadesplugin.CreateObjectAsync("CAdESCOM.CPSigner");
        if (oSigner) {
            yield oSigner.propset_Certificate(cert);
        }
        var oSignedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
        var CADES_BES = 1;
        yield oSignedData.propset_Content(dataToSign);
        yield oSigner.propset_Options(cadesplugin.CAPICOM_CERTIFICATE_INCLUDE_END_ENTITY_ONLY); 
        Signature = yield oSignedData.SignCades(oSigner, CADES_BES);
        
        setTimeout(()=> {
            document.getElementById("signedRez").innerHTML = Signature;
            document.getElementById("signedRezBlock").style.display = 'block';
            document.getElementById('preloader').style.display = 'none'
        }, 500)
        

    })
}




document.addEventListener('DOMContentLoaded',async ()=> {
    console.log("LoadSystem")
    

    await setTimeout(()=> { getVersionPropgramm(); getCerts()  }, 1000)


    document.getElementById('getInfoCert').onclick = onClicHandlerGetInfoCert
    document.getElementById('signStr').onclick = onClickHandlerSignStr

    

})
